import { handleLlmProxy } from '../../server/llmProxy';

export default function handler(request: Request) {
  return handleLlmProxy(request);
}
