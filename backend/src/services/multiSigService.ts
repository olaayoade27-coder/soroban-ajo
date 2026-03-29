import { PrismaClient } from '@prisma/client';

export interface MultiSigConfig {
  groupId: string;
  threshold: number;
  signers: string[];
}

export interface MultiSigProposal {
  id: string;
  groupId: string;
  threshold: number;
  signers: Array<{ address: string; signed: boolean; timestamp?: number }>;
  expiresAt: number;
  status: 'pending' | 'in-progress' | 'complete' | 'expired';
  createdAt: number;
}

export class MultiSigService {
  private prisma: PrismaClient;
  private proposals: Map<string, MultiSigProposal> = new Map();

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createMultiSigConfig(groupId: string, threshold: number, signers: string[]): Promise<MultiSigConfig> {
    if (threshold > signers.length) {
      throw new Error('Threshold cannot exceed number of signers');
    }
    if (threshold < 1) {
      throw new Error('Threshold must be at least 1');
    }
    return { groupId, threshold, signers };
  }

  async getMultiSigConfig(groupId: string): Promise<MultiSigConfig | null> {
    // Implementation would fetch from database
    return null;
  }

  async createProposal(
    groupId: string,
    signers: string[],
    threshold: number,
    expiryMinutes: number = 60
  ): Promise<MultiSigProposal> {
    const id = `proposal_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const proposal: MultiSigProposal = {
      id,
      groupId,
      threshold,
      signers: signers.map((addr) => ({ address: addr, signed: false })),
      expiresAt: Date.now() + expiryMinutes * 60 * 1000,
      status: 'pending',
      createdAt: Date.now(),
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  async signProposal(proposalId: string, signer: string): Promise<MultiSigProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (Date.now() > proposal.expiresAt) {
      proposal.status = 'expired';
      throw new Error('Proposal has expired');
    }

    const signerObj = proposal.signers.find((s) => s.address === signer);
    if (!signerObj) {
      throw new Error('Signer not authorized for this proposal');
    }

    if (signerObj.signed) {
      throw new Error('Signer has already signed');
    }

    signerObj.signed = true;
    signerObj.timestamp = Date.now();

    const signedCount = proposal.signers.filter((s) => s.signed).length;
    if (signedCount >= proposal.threshold) {
      proposal.status = 'complete';
    } else {
      proposal.status = 'in-progress';
    }

    this.proposals.set(proposalId, proposal);
    return proposal;
  }

  async getProposal(proposalId: string): Promise<MultiSigProposal | null> {
    return this.proposals.get(proposalId) || null;
  }

  async executeProposal(proposalId: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) {
      throw new Error('Proposal not found');
    }

    if (proposal.status !== 'complete') {
      throw new Error('Proposal is not ready for execution');
    }

    // Execute the proposal
    return true;
  }

  async getGroupProposals(groupId: string): Promise<MultiSigProposal[]> {
    return Array.from(this.proposals.values()).filter((p) => p.groupId === groupId);
  }

  async verifySignature(proposalId: string, signer: string): Promise<boolean> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal) return false;
    return proposal.signers.some((s) => s.address === signer && s.signed);
  }

  async submitTransaction(proposalId: string, xdr: string): Promise<string> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.status !== 'complete') {
      throw new Error('Cannot submit incomplete proposal');
    }
    // Submit to blockchain
    return `tx_${Date.now()}`;
  }

  async expireOldProposals(): Promise<number> {
    let expiredCount = 0;
    this.proposals.forEach((proposal) => {
      if (Date.now() > proposal.expiresAt && proposal.status !== 'expired') {
        proposal.status = 'expired';
        expiredCount++;
      }
    });
    return expiredCount;
  }
}
