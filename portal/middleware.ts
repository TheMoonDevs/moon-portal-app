import { chain } from '@/middlewares/chain';
import { withAuthMiddleware } from './middlewares/authMiddleware';

export default chain([withAuthMiddleware]);

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)', '/api/:path*'],
};
