import foo from '../../lib/foo';

describe('#foo', () => {
  it('bars', () => {
    foo('foo')
      .should.equal('barfoo');
  });
});
