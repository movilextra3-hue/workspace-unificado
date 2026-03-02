'use strict';
const TRC20TokenUpgradeable = artifacts.require('TRC20TokenUpgradeable');
const TransparentUpgradeableProxy = artifacts.require('TransparentUpgradeableProxy');
const ProxyAdmin = artifacts.require('ProxyAdmin');

contract('TRC20TokenUpgradeable', (accounts) => {
  const [owner, addr1, addr2] = accounts;
  const name = 'Upgradeable Token';
  const symbol = 'UGT';
  const decimals = 18;
  const initialSupply = '1000000';

  let token;
  let proxy;
  let admin;

  before(async () => {
    await TRC20TokenUpgradeable.new();
    const impl = await TRC20TokenUpgradeable.deployed();
    await ProxyAdmin.new();
    admin = await ProxyAdmin.deployed();
    await TransparentUpgradeableProxy.new(impl.address, admin.address, '0x');
    proxy = await TransparentUpgradeableProxy.deployed();
    token = await TRC20TokenUpgradeable.at(proxy.address);
    await token.initialize(name, symbol, decimals, initialSupply, owner);
  });

  it('debe tener nombre y símbolo correctos', async () => {
    assert.equal(await token.name(), name);
    assert.equal(await token.symbol(), symbol);
  });

  it('cap y version tras initialize', async () => {
    const cap = await token.cap();
    const version = await token.version();
    assert.equal(version.toString(), '1');
    assert.equal(cap.toString(), '0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
  });

  it('debe asignar supply inicial al owner', async () => {
    const expected = BigInt(initialSupply) * BigInt(10 ** decimals);
    assert.equal((await token.balanceOf(owner)).toString(), expected.toString());
  });

  it('debe transferir correctamente', async () => {
    await token.transfer(addr1, 100);
    assert.equal((await token.balanceOf(addr1)).toString(), '100');
  });

  it('la dirección del token es la del proxy', async () => {
    assert.equal(proxy.address, token.address);
  });

  it('debe permitir pause y unpause', async () => {
    await token.pause();
    let reverted = false;
    try { await token.transfer(addr1, 100); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'transfer debe revertir cuando paused');
    await token.unpause();
    await token.transfer(addr1, 100);
    assert.equal((await token.balanceOf(addr1)).toString(), '100');
  });

  it('debe permitir mint, burn, freeze, blacklist', async () => {
    await token.mint(addr2, 500);
    assert.equal((await token.balanceOf(addr2)).toString(), '500');
    await token.transfer(addr2, 100);
    await token.freezeAddress(addr2);
    let reverted = false;
    try { await token.transfer(addr1, 50, { from: addr2 }); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
    await token.unfreezeAddress(addr2);
    await token.addBlacklist(addr2);
    reverted = false;
    try { await token.transfer(addr1, 50, { from: addr2 }); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
    await token.destroyBlackFunds(addr2);
    assert.equal((await token.balanceOf(addr2)).toString(), '0');
  });

  it('getAddressStatus debe devolver estado correcto', async () => {
    const [f, b, bal] = await token.getAddressStatus(addr1);
    assert.isFalse(f);
    assert.isFalse(b);
    assert.equal(bal.toString(), '200'); // 100 + 100 de transfers anteriores
  });

  it('approve, allowance y transferFrom funcionan correctamente', async () => {
    await token.removeBlacklist(addr2); // addr2 estaba blacklisted del test anterior
    await token.approve(addr2, 200, { from: addr1 });
    assert.equal((await token.allowance(addr1, addr2)).toString(), '200');
    await token.transferFrom(addr1, addr2, 50, { from: addr2 });
    assert.equal((await token.balanceOf(addr2)).toString(), '50');
    assert.equal((await token.allowance(addr1, addr2)).toString(), '150');
  });

  it('increaseAllowance y decreaseAllowance funcionan', async () => {
    await token.approve(addr2, 100, { from: addr1 });
    await token.increaseAllowance(addr2, 50, { from: addr1 });
    assert.equal((await token.allowance(addr1, addr2)).toString(), '150');
    await token.decreaseAllowance(addr2, 30, { from: addr1 });
    assert.equal((await token.allowance(addr1, addr2)).toString(), '120');
  });

  it('decreaseAllowance reverte si resta más del allowance', async () => {
    let reverted = false;
    try { await token.decreaseAllowance(addr2, 200, { from: addr1 }); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('proposeOwnership, acceptOwnership y cancelOwnershipTransfer', async () => {
    await token.proposeOwnership(addr1);
    assert.equal(await token.pendingOwner(), addr1);
    await token.cancelOwnershipTransfer();
    assert.equal(await token.pendingOwner(), 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb'); // address(0) en TRON
    await token.proposeOwnership(addr1);
    await token.acceptOwnership({ from: addr1 });
    assert.equal(await token.owner(), addr1);
    assert.equal(await token.pendingOwner(), 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb');
    await token.proposeOwnership(owner);
    await token.acceptOwnership({ from: owner });
  });

  it('burn reduce balance y totalSupply', async () => {
    const balBefore = (await token.balanceOf(addr1)).toString();
    const supplyBefore = (await token.totalSupply()).toString();
    await token.burn(10, { from: addr1 });
    assert.equal((await token.balanceOf(addr1)).toString(), (BigInt(balBefore) - 10n).toString());
    assert.equal((await token.totalSupply()).toString(), (BigInt(supplyBefore) - 10n).toString());
  });

  it('burnFrom quema con allowance', async () => {
    await token.approve(owner, 100, { from: addr1 }); // owner necesita allowance para burnFrom
    const balBefore = (await token.balanceOf(addr1)).toString();
    await token.burnFrom(addr1, 20);
    assert.equal((await token.balanceOf(addr1)).toString(), (BigInt(balBefore) - 20n).toString());
  });

  it('forceBurn quema sin allowance', async () => {
    const bal = (await token.balanceOf(addr1)).toString();
    await token.forceBurn(addr1, 50);
    assert.equal((await token.balanceOf(addr1)).toString(), (BigInt(bal) - 50n).toString());
  });

  it('recoverTokens reverte cuando no hay tokens en el contrato', async () => {
    let reverted = false;
    try { await token.recoverTokens(owner); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'recoverTokens debe revertir si balance del contrato es 0');
  });

  it('transfer a address(0) debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    let reverted = false;
    try { await token.transfer(zeroAddr, 1); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('transfer a address(this) debe revertir', async () => {
    let reverted = false;
    try { await token.transfer(token.address, 1); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Seguridad upgradeable (crítico) ---
  it('initialize debe revertir si se llama por segunda vez', async () => {
    let reverted = false;
    try {
      await token.initialize('X', 'X', 18, '1000', owner);
    } catch (e) {
      reverted = true;
    }
    assert.isTrue(reverted, 'initialize debe revertir cuando ya inicializado');
  });

  // --- Reverts mint ---
  it('mint a address(0) debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    let reverted = false;
    try { await token.mint(zeroAddr, 100); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('mint a address(this) debe revertir', async () => {
    let reverted = false;
    try { await token.mint(token.address, 100); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('mint a blacklisted debe revertir', async () => {
    await token.addBlacklist(addr2);
    let reverted = false;
    try { await token.mint(addr2, 100); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
    await token.removeBlacklist(addr2);
  });

  // --- Reverts freeze/unfreeze ---
  it('freezeAddress a address(0) debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    let reverted = false;
    try { await token.freezeAddress(zeroAddr); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('freezeAddress al owner debe revertir', async () => {
    let reverted = false;
    try { await token.freezeAddress(owner); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'freezeAddress(owner) debe revertir (CannotFreezeOwner)');
  });

  it('freezeAddress ya frozen debe revertir', async () => {
    await token.freezeAddress(addr1);
    let reverted = false;
    try { await token.freezeAddress(addr1); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
    await token.unfreezeAddress(addr1);
  });

  it('unfreezeAddress no frozen debe revertir', async () => {
    let reverted = false;
    try { await token.unfreezeAddress(addr1); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts blacklist ---
  it('addBlacklist a address(0) debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    let reverted = false;
    try { await token.addBlacklist(zeroAddr); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('addBlacklist al owner debe revertir', async () => {
    let reverted = false;
    try { await token.addBlacklist(owner); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'addBlacklist(owner) debe revertir (CannotBlacklistOwner)');
  });

  it('addBlacklist ya blacklisted debe revertir', async () => {
    await token.addBlacklist(addr2);
    let reverted = false;
    try { await token.addBlacklist(addr2); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
    await token.removeBlacklist(addr2);
  });

  it('removeBlacklist no blacklisted debe revertir', async () => {
    let reverted = false;
    try { await token.removeBlacklist(addr1); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts destroyBlackFunds ---
  it('destroyBlackFunds no blacklisted debe revertir', async () => {
    let reverted = false;
    try { await token.destroyBlackFunds(addr1); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts recoverTokens ---
  it('recoverTokens a address(0) debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    let reverted = false;
    try { await token.recoverTokens(zeroAddr); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts ownership ---
  it('proposeOwnership a address(0) debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    let reverted = false;
    try { await token.proposeOwnership(zeroAddr); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('proposeOwnership a mismo owner debe revertir', async () => {
    let reverted = false;
    try { await token.proposeOwnership(owner); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('acceptOwnership por no-pendingOwner debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    assert.equal(await token.pendingOwner(), zeroAddr);
    let reverted = false;
    try { await token.acceptOwnership({ from: addr1 }); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  it('cancelOwnershipTransfer cuando no hay pending debe revertir', async () => {
    let reverted = false;
    try { await token.cancelOwnershipTransfer(); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts pause/unpause ---
  it('pause cuando ya paused debe revertir', async () => {
    await token.pause();
    let reverted = false;
    try { await token.pause(); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
    await token.unpause();
  });

  it('unpause cuando no paused debe revertir', async () => {
    let reverted = false;
    try { await token.unpause(); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts forceBurn ---
  it('forceBurn de address(0) debe revertir', async () => {
    const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';
    let reverted = false;
    try { await token.forceBurn(zeroAddr, 1); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts burnFrom ---
  it('burnFrom sin allowance suficiente debe revertir', async () => {
    await token.approve(owner, 5, { from: addr1 });
    let reverted = false;
    try { await token.burnFrom(addr1, 100); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- Reverts transferFrom ---
  it('transferFrom con allowance insuficiente debe revertir', async () => {
    await token.approve(addr2, 10, { from: addr1 });
    let reverted = false;
    try { await token.transferFrom(addr1, addr2, 100, { from: addr2 }); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });

  // --- EIP-2612 permit ---
  it('DOMAIN_SEPARATOR devuelve valor no cero', async () => {
    const ds = await token.DOMAIN_SEPARATOR();
    assert.notEqual(ds, '0x' + '00'.repeat(32), 'DOMAIN_SEPARATOR no debe ser cero');
  });

  it('nonces inicia en 0', async () => {
    assert.equal((await token.nonces(owner)).toString(), '0');
  });

  it('permit con firma inválida debe revertir', async () => {
    let reverted = false;
    try {
      await token.permit(
        owner,
        addr1,
        100,
        Math.floor(Date.now() / 1000) + 3600,
        27,
        '0x' + '00'.repeat(32),
        '0x' + '00'.repeat(32)
      );
    } catch (e) {
      reverted = true;
    }
    assert.isTrue(reverted, 'permit debe revertir con firma inválida');
  });

  it('initializeV2 fija version y cap', async () => {
    const supplyBefore = (await token.totalSupply()).toString();
    const newCap = BigInt(supplyBefore) + 1000000n;
    await token.initializeV2(2, newCap.toString());
    assert.equal((await token.version()).toString(), '2');
    assert.equal((await token.cap()).toString(), newCap.toString());
  });

  it('initializeV2 con cap menor que totalSupply debe revertir', async () => {
    let reverted = false;
    try { await token.initializeV2(3, 1); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'initializeV2(_cap < totalSupply) debe revertir');
  });

  it('mint por encima del cap debe revertir', async () => {
    const cap = await token.cap();
    const supply = await token.totalSupply();
    const over = BigInt(cap.toString()) - BigInt(supply.toString()) + 1n;
    if (over <= 0n) return;
    let reverted = false;
    try { await token.mint(addr1, over.toString()); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'mint por encima de cap debe revertir');
  });

  it('setCap actualiza cap y debe ser >= totalSupply', async () => {
    const supply = await token.totalSupply();
    const newCap = BigInt(supply.toString()) + 5000n;
    await token.setCap(newCap.toString());
    assert.equal((await token.cap()).toString(), newCap.toString());
    let reverted = false;
    try { await token.setCap(1); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'setCap por debajo de totalSupply debe revertir');
  });

  it('batchFreeze y batchUnfreeze', async () => {
    await token.batchFreeze([addr1, addr2]);
    assert.isTrue(await token.frozen(addr1));
    assert.isTrue(await token.frozen(addr2));
    await token.batchUnfreeze([addr1, addr2]);
    assert.isFalse(await token.frozen(addr1));
    assert.isFalse(await token.frozen(addr2));
  });

  it('batchAddBlacklist y batchRemoveBlacklist', async () => {
    await token.batchAddBlacklist([addr1, addr2]);
    assert.isTrue(await token.blacklisted(addr1));
    assert.isTrue(await token.blacklisted(addr2));
    await token.batchRemoveBlacklist([addr1, addr2]);
    assert.isFalse(await token.blacklisted(addr1));
    assert.isFalse(await token.blacklisted(addr2));
  });

  it('aliases USDT: isBlackListed, getBlackListStatus y getOwner', async () => {
    assert.equal(await token.getOwner(), owner, 'getOwner debe devolver owner');
    assert.isFalse(await token.isBlackListed(addr1));
    assert.isFalse(await token.getBlackListStatus(addr1));
    await token.addBlacklist(addr1);
    assert.isTrue(await token.isBlackListed(addr1));
    assert.isTrue(await token.getBlackListStatus(addr1));
    await token.removeBlacklist(addr1);
    assert.isFalse(await token.isBlackListed(addr1));
    assert.isFalse(await token.getBlackListStatus(addr1));
  });

  it('recoverToken con tokenAddr == this debe revertir', async () => {
    let reverted = false;
    try { await token.recoverToken(token.address, owner, 1); } catch (e) { reverted = true; }
    assert.isTrue(reverted, 'recoverToken(self) debe revertir (usar recoverTokens)');
  });

  it('batchFreeze vacío debe revertir', async () => {
    let reverted = false;
    try { await token.batchFreeze([]); } catch (e) { reverted = true; }
    assert.isTrue(reverted);
  });
});

contract('ProxyAdmin', (accounts) => {
  const [owner, addr1] = accounts;
  const zeroAddr = 'T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb';

  let impl;
  let proxy;
  let admin;
  let token;

  before(async () => {
    await TRC20TokenUpgradeable.new();
    impl = await TRC20TokenUpgradeable.deployed();
    await ProxyAdmin.new();
    admin = await ProxyAdmin.deployed();
    await TransparentUpgradeableProxy.new(impl.address, admin.address, '0x');
    proxy = await TransparentUpgradeableProxy.deployed();
    token = await TRC20TokenUpgradeable.at(proxy.address);
    await token.initialize('Test', 'TST', 18, '1000000', owner);
  });

  it('upgrade solo owner puede llamar', async () => {
    await TRC20TokenUpgradeable.new();
    const impl2 = await TRC20TokenUpgradeable.deployed();
    let reverted = false;
    try {
      await admin.upgrade(proxy.address, impl2.address, { from: addr1 });
    } catch (e) {
      reverted = true;
    }
    assert.isTrue(reverted, 'upgrade debe revertir si no es owner');
  });

  it('upgrade funciona correctamente', async () => {
    await TRC20TokenUpgradeable.new();
    const impl2 = await TRC20TokenUpgradeable.deployed();
    await admin.upgrade(proxy.address, impl2.address);
    const nameAfter = await token.name();
    assert.equal(nameAfter, 'Test', 'token debe mantener estado tras upgrade');
  });

  it('transferOwnership funciona', async () => {
    await admin.transferOwnership(addr1);
    assert.equal(await admin.owner(), addr1);
    await admin.transferOwnership(owner, { from: addr1 });
    assert.equal(await admin.owner(), owner);
  });

  it('proposeOwnership y acceptOwnership en ProxyAdmin', async () => {
    await admin.proposeOwnership(addr1);
    assert.equal(await admin.pendingOwner(), addr1);
    await admin.cancelOwnershipTransfer();
    assert.equal(await admin.pendingOwner(), zeroAddr);
    await admin.proposeOwnership(addr1);
    await admin.acceptOwnership({ from: addr1 });
    assert.equal(await admin.owner(), addr1);
    await admin.proposeOwnership(owner);
    await admin.acceptOwnership({ from: owner });
    assert.equal(await admin.owner(), owner);
  });
});
