import { handleLlmProxy } from '../server/llmProxy';

export default {
  fetch(request: Request) {
    return handleLlmProxy(request);
  },
};
