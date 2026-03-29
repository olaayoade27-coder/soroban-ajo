import { Router, Request, Response } from 'express';
import { MultiSigService } from '@/services/multiSigService';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();
const multiSigService = new MultiSigService(prisma);

router.post('/proposals', async (req: Request, res: Response) => {
  try {
    const { signers, threshold, expiresAt } = req.body;
    const proposal = await multiSigService.createProposal(
      req.body.groupId,
      signers,
      threshold,
      Math.ceil((expiresAt - Date.now()) / (60 * 1000))
    );
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create proposal' });
  }
});

router.get('/proposals/:proposalId', async (req: Request, res: Response) => {
  try {
    const proposal = await multiSigService.getProposal(req.params.proposalId);
    if (!proposal) {
      return res.status(404).json({ error: 'Proposal not found' });
    }
    res.json(proposal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposal' });
  }
});

router.post('/proposals/:proposalId/sign', async (req: Request, res: Response) => {
  try {
    const { signer } = req.body;
    const proposal = await multiSigService.signProposal(req.params.proposalId, signer);
    res.json(proposal);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to sign proposal' });
  }
});

router.post('/proposals/:proposalId/execute', async (req: Request, res: Response) => {
  try {
    const success = await multiSigService.executeProposal(req.params.proposalId);
    res.json({ success });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to execute proposal' });
  }
});

router.get('/groups/:groupId/proposals', async (req: Request, res: Response) => {
  try {
    const proposals = await multiSigService.getGroupProposals(req.params.groupId);
    res.json(proposals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch proposals' });
  }
});

export default router;
