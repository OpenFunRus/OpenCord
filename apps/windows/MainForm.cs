using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace OpenCord.Windows;

internal sealed class MainForm : Form
{
    private const string AppTitle = "OpenCord";
    private const string AppUrl = "https://opencord.ru:40600/";
    private const string AllowedOrigin = "https://opencord.ru:40600";
    private const int DwmWindowAttributeUseImmersiveDarkMode = 20;
    private const int DwmWindowAttributeUseImmersiveDarkModeLegacy = 19;

    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);
    private static readonly Icon AppIcon =
        Icon.ExtractAssociatedIcon(Application.ExecutablePath) ?? SystemIcons.Application;

    private readonly NotifyIcon trayIcon;
    private readonly ContextMenuStrip trayMenu;
    private readonly WebView2 webView;
    private bool allowClose;

    public MainForm()
    {
        Text = AppTitle;
        StartPosition = FormStartPosition.CenterScreen;
        MinimumSize = new Size(980, 700);
        Size = new Size(1440, 900);
        Icon = AppIcon;
        BackColor = Color.FromArgb(18, 18, 20);

        webView = new WebView2
        {
            Dock = DockStyle.Fill
        };

        trayMenu = new ContextMenuStrip();
        trayMenu.Items.Add("Открыть OpenCord", null, (_, _) => RestoreFromTray());
        trayMenu.Items.Add("Перезагрузить", null, (_, _) => webView.Reload());
        trayMenu.Items.Add(new ToolStripSeparator());
        trayMenu.Items.Add("Выход", null, (_, _) => ExitApplication());

        trayIcon = new NotifyIcon
        {
            Text = AppTitle,
            Visible = true,
            Icon = AppIcon,
            ContextMenuStrip = trayMenu
        };

        trayIcon.DoubleClick += (_, _) => RestoreFromTray();
        trayIcon.BalloonTipClicked += (_, _) => RestoreFromTray();

        Controls.Add(webView);

        Load += OnLoad;
        Resize += OnResize;
        FormClosing += OnFormClosing;
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        EnableDarkTitleBar();
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            trayIcon.Dispose();
            trayMenu.Dispose();
            webView.Dispose();
        }

        base.Dispose(disposing);
    }

    private async void OnLoad(object? sender, EventArgs e)
    {
        await InitializeWebViewAsync();
    }

    private async Task InitializeWebViewAsync()
    {
        try
        {
            var userDataFolder = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "OpenCord.Windows",
                "WebView2"
            );

            Directory.CreateDirectory(userDataFolder);

            var environment = await CoreWebView2Environment.CreateAsync(
                userDataFolder: userDataFolder
            );

            await webView.EnsureCoreWebView2Async(environment);
            await webView.CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync(
                BuildNotificationBridgeScript()
            );

            webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
            webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
            webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

            webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;
            webView.CoreWebView2.NavigationStarting += OnNavigationStarting;
            webView.CoreWebView2.NewWindowRequested += OnNewWindowRequested;

            webView.Source = new Uri(AppUrl);
        }
        catch (WebView2RuntimeNotFoundException)
        {
            ShowRuntimeMissingMessage();
            ExitApplication();
        }
        catch (Exception exception)
        {
            MessageBox.Show(
                this,
                $"Не удалось запустить Windows-оболочку OpenCord.{Environment.NewLine}{Environment.NewLine}{exception.Message}",
                AppTitle,
                MessageBoxButtons.OK,
                MessageBoxIcon.Error
            );

            ExitApplication();
        }
    }

    private void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        try
        {
            var message =
                JsonSerializer.Deserialize<DesktopHostMessage>(e.WebMessageAsJson, JsonOptions);

            if (message?.Type != "notification")
            {
                return;
            }

            ShowDesktopNotification(message);
        }
        catch
        {
            // Ignore malformed bridge messages from the page.
        }
    }

    private void OnNavigationStarting(object? sender, CoreWebView2NavigationStartingEventArgs e)
    {
        if (!Uri.TryCreate(e.Uri, UriKind.Absolute, out var uri))
        {
            return;
        }

        if (uri.GetLeftPart(UriPartial.Authority).Equals(AllowedOrigin, StringComparison.OrdinalIgnoreCase))
        {
            return;
        }

        e.Cancel = true;
        OpenExternal(uri.ToString());
    }

    private void OnNewWindowRequested(object? sender, CoreWebView2NewWindowRequestedEventArgs e)
    {
        e.Handled = true;

        if (!string.IsNullOrWhiteSpace(e.Uri))
        {
            OpenExternal(e.Uri);
        }
    }

    private void OnResize(object? sender, EventArgs e)
    {
        if (WindowState != FormWindowState.Minimized)
        {
            return;
        }

        Hide();
        ShowTrayBalloon("OpenCord работает в фоне", "Приложение свернуто в трей.");
    }

    private void OnFormClosing(object? sender, FormClosingEventArgs e)
    {
        if (
            e.CloseReason is CloseReason.WindowsShutDown
                or CloseReason.ApplicationExitCall
                or CloseReason.TaskManagerClosing
        )
        {
            trayIcon.Visible = false;
            return;
        }

        if (allowClose)
        {
            trayIcon.Visible = false;
            return;
        }

        e.Cancel = true;
        Hide();
        ShowTrayBalloon(
            "OpenCord работает в фоне",
            "Используйте значок в трее, чтобы открыть окно или выйти."
        );
    }

    private void ShowDesktopNotification(DesktopHostMessage message)
    {
        var title = string.IsNullOrWhiteSpace(message.Title) ? AppTitle : message.Title;
        var body = string.IsNullOrWhiteSpace(message.Body)
            ? "У вас новое сообщение."
            : message.Body;

        ShowTrayBalloon(title, body);
    }

    private void ShowTrayBalloon(string title, string body)
    {
        trayIcon.BalloonTipTitle = title;
        trayIcon.BalloonTipText = body;
        trayIcon.BalloonTipIcon = ToolTipIcon.Info;
        trayIcon.ShowBalloonTip(5000);
    }

    private void RestoreFromTray()
    {
        Show();
        WindowState = FormWindowState.Normal;
        Activate();
    }

    private void ExitApplication()
    {
        allowClose = true;
        trayIcon.Visible = false;
        Close();
    }

    private void ShowRuntimeMissingMessage()
    {
        const string runtimeUrl = "https://developer.microsoft.com/en-us/microsoft-edge/webview2/";

        MessageBox.Show(
            this,
            "Microsoft Edge WebView2 Runtime не установлен.\n\nУстановите его и запустите OpenCord снова.",
            AppTitle,
            MessageBoxButtons.OK,
            MessageBoxIcon.Warning
        );

        OpenExternal(runtimeUrl);
    }

    private static void OpenExternal(string target)
    {
        Process.Start(
            new ProcessStartInfo
            {
                FileName = target,
                UseShellExecute = true
            }
        );
    }

    private void EnableDarkTitleBar()
    {
        if (!OperatingSystem.IsWindows())
        {
            return;
        }

        var enabled = 1;

        var result = DwmSetWindowAttribute(
            Handle,
            DwmWindowAttributeUseImmersiveDarkMode,
            ref enabled,
            sizeof(int)
        );

        if (result != 0)
        {
            DwmSetWindowAttribute(
                Handle,
                DwmWindowAttributeUseImmersiveDarkModeLegacy,
                ref enabled,
                sizeof(int)
            );
        }
    }

    private static string BuildNotificationBridgeScript()
    {
        return """
            (() => {
              if (!window.chrome?.webview?.postMessage) {
                return;
              }

              window.__OPENCORD_DESKTOP__ = true;

              const postToHost = (payload) => {
                try {
                  window.chrome.webview.postMessage(payload);
                } catch {
                  // ignore bridge errors
                }
              };

              class DesktopNotification extends EventTarget {
                static permission = 'granted';

                static requestPermission() {
                  return Promise.resolve('granted');
                }

                constructor(title, options = {}) {
                  super();

                  this.title = title;
                  this.options = options;
                  this.data = options.data ?? null;
                  this.silent = options.silent ?? false;
                  this.onclick = null;
                  this.onerror = null;
                  this.onshow = null;
                  this.onclose = null;

                  postToHost({
                    type: 'notification',
                    title,
                    body: options.body ?? '',
                    icon: options.icon ?? null,
                    tag: options.tag ?? null
                  });

                  queueMicrotask(() => {
                    const event = new Event('show');
                    this.dispatchEvent(event);

                    if (typeof this.onshow === 'function') {
                      this.onshow(event);
                    }
                  });
                }

                close() {
                  const event = new Event('close');
                  this.dispatchEvent(event);

                  if (typeof this.onclose === 'function') {
                    this.onclose(event);
                  }
                }
              }

              Object.defineProperty(window, 'Notification', {
                configurable: true,
                writable: true,
                value: DesktopNotification
              });
            })();
            """;
    }

    private sealed class DesktopHostMessage
    {
        public string? Type { get; init; }

        public string? Title { get; init; }

        public string? Body { get; init; }
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(
        IntPtr hwnd,
        int dwAttribute,
        ref int pvAttribute,
        int cbAttribute
    );
}
