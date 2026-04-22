type THasMentionOptions = {
  userId?: number;
  roleIds?: number[];
};

const hasMentionWithAttribute = (
  content: string,
  attribute: string,
  value: string
) =>
  new RegExp(
    `<span(?=[^>]*\\bdata-type="mention")(?=[^>]*\\b${attribute}="${value}")[^>]*>`
  ).test(content);

const hasMention = (
  content: string | null | undefined,
  options: number | THasMentionOptions | undefined
): boolean => {
  if (!content) return false;

  const normalizedOptions =
    typeof options === 'number' ? { userId: options } : (options ?? {});

  if (
    normalizedOptions.userId === undefined &&
    (!normalizedOptions.roleIds || normalizedOptions.roleIds.length === 0)
  ) {
    return false;
  }

  if (
    normalizedOptions.userId &&
    hasMentionWithAttribute(
      content,
      'data-user-id',
      String(normalizedOptions.userId)
    )
  ) {
    return true;
  }

  if (
    normalizedOptions.roleIds?.some((roleId) =>
      hasMentionWithAttribute(content, 'data-role-id', String(roleId))
    )
  ) {
    return true;
  }

  return hasMentionWithAttribute(content, 'data-mention-kind', 'everyone');
};

export { hasMention, type THasMentionOptions };
