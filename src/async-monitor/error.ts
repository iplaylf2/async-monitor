export class AsyncMonitorError extends Error {}

export class SynchronizationLockError extends AsyncMonitorError {}

export class DeprecateCriticalSectionError extends AsyncMonitorError {}

export class InterruptedError extends AsyncMonitorError {}

export class MismatchCriticalSectionError extends AsyncMonitorError {}
