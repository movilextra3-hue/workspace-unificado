'use strict';

const { expect } = require('chai');
const hre = require('hardhat');

describe('MiToken', function () {
  it('debería desplegar con supply inicial', async function () {
    const [owner] = await hre.ethers.getSigners();
    void owner; /* usado implícitamente: deploy usa primera cuenta */
    const MiToken = await hre.ethers.getContractFactory('MiToken');
    const token = await MiToken.deploy('Mi Token', 'MTK', 18, 1000000);
    await token.waitForDeployment();
    const supply = await token.totalSupply();
    expect(supply).to.equal(hre.ethers.parseEther('1000000'));
  });
});
