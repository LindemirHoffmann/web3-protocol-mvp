// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract SimpleDAO is Ownable {
    IERC20 public immutable governanceToken;
    uint256 public proposalCount;

    struct Proposal {
        uint256 id;
        string description;
        uint256 deadline;
        uint256 votesFor;
        uint256 votesAgainst;
        bool executed;
    }

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed id,
        string description,
        uint256 deadline
    );

    event Voted(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 votingPower
    );

    event ProposalExecuted(uint256 indexed proposalId, bool approved);

    constructor(address tokenAddress) Ownable(msg.sender) {
        governanceToken = IERC20(tokenAddress);
    }

    function createProposal(
        string calldata description,
        uint256 durationInSeconds
    ) external returns (uint256) {
        require(
            governanceToken.balanceOf(msg.sender) > 0,
            "Need tokens to create proposal"
        );
        require(durationInSeconds > 0, "Invalid duration");

        proposalCount++;
        uint256 proposalId = proposalCount;

        proposals[proposalId] = Proposal({
            id: proposalId,
            description: description,
            deadline: block.timestamp + durationInSeconds,
            votesFor: 0,
            votesAgainst: 0,
            executed: false
        });

        emit ProposalCreated(
            proposalId,
            description,
            block.timestamp + durationInSeconds
        );

        return proposalId;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp < proposal.deadline, "Voting period ended");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 votingPower = governanceToken.balanceOf(msg.sender);
        require(votingPower > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            proposal.votesFor += votingPower;
        } else {
            proposal.votesAgainst += votingPower;
        }

        emit Voted(proposalId, msg.sender, support, votingPower);
    }

    function executeProposal(uint256 proposalId) external {
        Proposal storage proposal = proposals[proposalId];

        require(proposal.id != 0, "Proposal does not exist");
        require(block.timestamp >= proposal.deadline, "Voting still active");
        require(!proposal.executed, "Already executed");

        proposal.executed = true;
        bool approved = proposal.votesFor > proposal.votesAgainst;

        emit ProposalExecuted(proposalId, approved);
    }

    function getProposalResult(uint256 proposalId)
        external
        view
        returns (bool approved)
    {
        Proposal memory proposal = proposals[proposalId];
        require(proposal.id != 0, "Proposal does not exist");

        return proposal.votesFor > proposal.votesAgainst;
    }
}