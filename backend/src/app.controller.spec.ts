import { AppController } from './app.controller.js';
import { ChainService } from './chain/chain.service.js';

describe('AppController', () => {
  it('reports healthy with the chain status', async () => {
    const status = {
      chainId: 31337,
      upfront: null,
      upfrontVersion: null,
      accessVersion: null,
    };
    const chain = { status: async () => status } as unknown as ChainService;

    await expect(new AppController(chain).health()).resolves.toEqual({
      ok: true,
      ...status,
    });
  });
});
