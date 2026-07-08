import LoadingSpinner from '../common/LoadingSpinner';

export default function PageLayout({
  title,
  subtitle,
  action,
  loading = false,
  centered = false,
  fullWidth = false,
  compact = false,
  children,
  className = '',
}) {
  if (loading) {
    return (
      <div className="page-container flex-1 flex items-center justify-center min-h-[50vh]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const containerCls = fullWidth
    ? `w-full flex-1 px-4 sm:px-6 ${compact ? 'py-4' : 'py-6 sm:py-8'}`
    : `page-container flex-1 ${compact ? 'py-4' : 'py-8 sm:py-10'} ${centered ? 'flex flex-col items-center' : ''}`;

  return (
    <div className={`${containerCls} ${className}`}>
      {(title || action) && (
        <header className={`page-header ${centered ? 'page-header-centered flex-col' : 'w-full'}`}>
          <div className={centered ? 'text-center w-full' : 'min-w-0 flex-1'}>
            {title && <h1 className="page-title">{title}</h1>}
            {subtitle && <p className="page-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </header>
      )}
      <div className={centered ? 'w-full max-w-2xl' : 'w-full'}>
        {children}
      </div>
    </div>
  );
}
