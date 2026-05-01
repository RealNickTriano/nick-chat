type Props = {
  docsUrl: string;
};

export const ApiKeyDocsLink = ({ docsUrl }: Props) => {
  return (
    <a
      href={docsUrl}
      target="_blank"
      rel="noreferrer"
      className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center justify-center gap-1"
    >
      Get key
      <svg
        width="10"
        height="10"
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M2 8L8 2M4 2h4v4" />
      </svg>
    </a>
  );
};
