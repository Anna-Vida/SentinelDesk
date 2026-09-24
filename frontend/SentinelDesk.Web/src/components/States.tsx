export const LoadingState = ({ label = 'Loading operational data…' }: { label?: string }) => <div className="state-card"><span className="spinner" />{label}</div>
export const EmptyState = ({ title, detail }: { title: string; detail: string }) => <div className="state-card"><strong>{title}</strong><span>{detail}</span></div>
export const ErrorState = ({ message, retry }: { message: string; retry?: () => void }) => <div className="state-card error"><strong>Unable to load data</strong><span>{message}</span>{retry && <button className="button ghost" onClick={retry}>Try again</button>}</div>
