import Anthropic from '@anthropic-ai/sdk';
import { recordUsage } from './usage';

type ClientOptions = ConstructorParameters<typeof Anthropic>[0];

/**
 * The only place in this app that should construct an Anthropic client.
 *
 * Wraps messages.create() so every call is costed and written to ai_usage
 * against whoever requireUser() put in the ambient usage context. Constructing
 * `new Anthropic()` directly still works, it just spends money invisibly —
 * which is the thing this exists to prevent.
 *
 * The recording insert is awaited rather than fired-and-forgotten: on Vercel,
 * work still pending when the handler returns can be killed mid-flight, and a
 * dropped insert is spend we never see. One extra round-trip against a call
 * that already takes seconds is the right trade.
 */
export function anthropicClient(opts: ClientOptions): Anthropic {
  const client = new Anthropic(opts);
  const create = client.messages.create.bind(client.messages);

  (client.messages as unknown as Record<string, unknown>).create = async (
    ...args: Parameters<typeof create>
  ) => {
    const result = await create(...args);
    // Non-streaming calls resolve to a Message carrying model + usage.
    // Streams resolve to a Stream, which has neither — nothing to record.
    if (result && typeof result === 'object' && 'usage' in result && 'model' in result) {
      const msg = result as { model: string; usage: Anthropic.Usage };
      await recordUsage(msg.model, msg.usage);
    }
    return result;
  };

  return client;
}
