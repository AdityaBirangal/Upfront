import { AppController } from './app.controller.js';

describe('AppController', () => {
  it('reports healthy', () => {
    expect(new AppController().health()).toEqual({ ok: true });
  });
});
