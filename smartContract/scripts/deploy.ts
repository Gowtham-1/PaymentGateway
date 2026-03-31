import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    // Deployer is the backend signer for now
    const backendSignerAddress = deployer.address;

    const Gateway = await ethers.getContractFactory("PaymentGateway");
    const gateway = await Gateway.deploy(backendSignerAddress);

    await gateway.waitForDeployment();

    console.log("PaymentGateway deployed to:", await gateway.getAddress());
    console.log("Backend Signer mapped to:", backendSignerAddress);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
