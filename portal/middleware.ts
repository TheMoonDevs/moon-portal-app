import { chain } from '@/middlewares/chain';
import { withAuthMiddleware } from './middlewares/authMiddleware';
import { withRedirectMiddleware } from './middlewares/redirectMiddleware';

export default chain([withAuthMiddleware, withRedirectMiddleware]);

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|logout).*)',
    '/api/:path*',
    '/login/:path*',
  ],
};
