/** Backward-compatible offline validation entry point; the unified tool owns all analysis behavior. */
process.argv.splice(2, 0, 'validate');
import('./levels');
