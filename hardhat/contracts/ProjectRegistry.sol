// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract ProjectRegistry {
    event ProjectCreated(
        uint256 indexed projectId,
        address indexed creator,
        string ensName,
        address escrow,
        string metaURI
    );

    struct Project {
        address creator;
        address escrow;
        string ensName;
        string metaURI;
    }

    uint256 public nextId;
    mapping(uint256 => Project) private projects;

    function createProject(
        string calldata ensName,
        address escrow,
        string calldata metaURI
    ) external returns (uint256 id) {
        require(escrow != address(0), "escrow=0");
        id = ++nextId;
        projects[id] = Project(msg.sender, escrow, ensName, metaURI);
        emit ProjectCreated(id, msg.sender, ensName, escrow, metaURI);
    }

    function getProject(uint256 id) external view returns (Project memory) {
        Project memory p = projects[id];
        require(p.escrow != address(0), "not found");
        return p;
    }
}
