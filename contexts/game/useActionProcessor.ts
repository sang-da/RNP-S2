import { useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, db } from '../../services/firebase';
import { GameAction } from '../../types';

export const useActionProcessor = (
    role: 'admin' | 'student',
    finance: any, // Typed as the return of useFinanceLogic
    mechanics: any, // Typed as the return of useGameMechanics
    toast: (type: string, msg: string) => void
) => {
    useEffect(() => {
        if (role !== 'admin') return;

        const q = query(collection(db, 'action_queue'), where('status', '==', 'PENDING'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const action = change.doc.data() as GameAction;
                    const actionId = change.doc.id;

                    try {
                        console.log(`Processing action ${action.type} (${actionId})...`);
                        
                        switch (action.type) {
                            case 'TRANSFER_FUNDS':
                                await finance.executeTransferFunds(action.payload.sourceId, action.payload.targetId, action.payload.amount);
                                break;
                            case 'INJECT_CAPITAL':
                                await finance.executeInjectCapital(action.payload.studentId, action.payload.agencyId, action.payload.amount);
                                break;
                            case 'MANAGE_SAVINGS':
                                await finance.executeManageSavings(action.payload.studentId, action.payload.agencyId, action.payload.amount, action.payload.type);
                                break;
                            case 'TAKE_LOAN':
                            case 'REPAY_LOAN':
                                await finance.executeManageLoan(action.payload.studentId, action.payload.agencyId, action.payload.amount, action.type === 'TAKE_LOAN' ? 'TAKE' : 'REPAY');
                                break;
                            case 'BUY_SCORE':
                                await finance.executeRequestScorePurchase(action.payload.studentId, action.payload.agencyId, action.payload.amountPixi, action.payload.amountScore);
                                break;
                            case 'SUBMIT_QUIZ':
                                await finance.executeSubmitQuiz(action.payload);
                                break;
                            case 'BLACK_OP':
                                await mechanics.executePerformBlackOp(action.payload.studentId, action.payload.agencyId, action.payload.opType, action.payload.payload);
                                break;
                            case 'PROPOSE_MERGER':
                                await mechanics.executeProposeMerger(action.payload.sourceAgencyId, action.payload.targetAgencyId);
                                break;
                            case 'FINALIZE_MERGER':
                                await mechanics.executeFinalizeMerger(action.payload.mergerId, action.payload.targetAgencyId, action.payload.approved);
                                break;
                            case 'SEND_CHALLENGE':
                                await mechanics.executeSendChallenge(action.payload.targetAgencyId, action.payload.title, action.payload.description, action.payload.rewardVE, action.payload.rewardBudget);
                                break;
                            case 'SUBMIT_CHALLENGE_VOTE':
                                await mechanics.executeSubmitChallengeVote(action.payload.agencyId, action.payload.challengeId, action.payload.voterId, action.payload.vote);
                                break;
                            case 'PURCHASE_INTEL':
                                await mechanics.executePurchaseIntel(action.payload.agencyId, action.payload.weekId);
                                break;
                            case 'TRIGGER_VULTURE_BUYOUT':
                                await mechanics.executeTriggerVultureBuyout(action.payload.sourceAgencyId, action.payload.targetAgencyId);
                                break;
                            case 'PING':
                                console.log("PING RECEIVED from", action.studentId);
                                break;
                            default:
                                console.warn("Unknown action type:", action.type);
                        }

                        await updateDoc(doc(db, 'action_queue', actionId), { status: 'PROCESSED', processedAt: new Date().toISOString() });
                        toast('info', `Action ${action.type} traitée.`);

                    } catch (e: any) {
                        console.error(`Error processing action ${actionId}:`, e);
                        await updateDoc(doc(db, 'action_queue', actionId), { status: 'ERROR', error: e.message });
                    }
                }
            });
        });

        return () => unsubscribe();
    }, [role, finance, mechanics]);
};
