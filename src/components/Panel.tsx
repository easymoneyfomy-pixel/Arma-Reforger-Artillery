import { ReactNode } from 'react';

export function Panel({
  title,
  right,
  children,
  className = '',
  bodyClassName = '',
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel-title">
        <span>{title}</span>
        {right ? <span className="text-muted normal-case tracking-normal">{right}</span> : null}
      </header>
      <div className={`panel-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
