import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("ProjectRegistryModule", (m) => {
  const projectRegistry = m.contract("ProjectRegistry", [], {
    gasLimit: 1000000n,
  });

  return { projectRegistry };
});
