import { describe, it, expect } from 'vitest';

function cmpAsc(a: any, b: any) {
  const at = new Date(a.createdAt || a.timestamp || 0).getTime();
  const bt = new Date(b.createdAt || b.timestamp || 0).getTime();
  if (at !== bt) return at - bt;
  const ac = a.clientSeq || 0;
  const bc = b.clientSeq || 0;
  if (ac !== bc) return ac - bc;
  return (a.id > b.id ? 1 : -1);
}

describe('Ordenação de mensagens por data/hora ascendente', () => {
  it('ordena corretamente por createdAt e clientSeq em envios rápidos', () => {
    const base = new Date();
    const msgs = [
      { id: 'm1', text: 'a', createdAt: base, clientSeq: 1 },
      { id: 'm2', text: 'b', createdAt: base, clientSeq: 2 },
      { id: 'm3', text: 'c', createdAt: base, clientSeq: 3 },
    ];
    const ordered = msgs.slice().sort(cmpAsc);
    expect(ordered.map(m => m.text)).toEqual(['a','b','c']);
  });

  it('mantém mensagens do servidor depois das antigas com mesmo timestamp', () => {
    const t = new Date();
    const msgs = [
      { id: 'local-1', text: 'x', createdAt: t, clientSeq: 1 },
      { id: 'srv-1', text: 'y', createdAt: t, clientSeq: 0 },
    ];
    const ordered = msgs.slice().sort(cmpAsc);
    expect(ordered.map(m => m.id)).toEqual(['srv-1','local-1']);
  });

  it('ordena corretamente quando há valores timestamp e createdAt misturados', () => {
    const t1 = new Date('2026-01-01T10:00:00Z');
    const t2 = new Date('2026-01-01T10:01:00Z');
    const msgs = [
      { id: 'a', text: '1', createdAt: t1 },
      { id: 'b', text: '2', timestamp: t2 },
      { id: 'c', text: '3', createdAt: t1, clientSeq: 5 },
    ];
    const ordered = msgs.slice().sort(cmpAsc);
    expect(ordered.map(m => m.id)).toEqual(['a','c','b']);
  });
});
