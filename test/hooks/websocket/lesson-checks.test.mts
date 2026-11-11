// The websocket pack's checks (0.25.0), fired through the base lesson-checks hook.
import { holdsEachCaseIn, reviewPacksInstall } from '../lesson-cases.mts';

holdsEachCaseIn(reviewPacksInstall, [
  ['websocket', 'src/ws.ts', 'streamManager.updateHeartbeat(msg.agent_id, msg.status);\n', 'streamManager.updateHeartbeat(conn.agentId, msg.status);\n'],
]);
