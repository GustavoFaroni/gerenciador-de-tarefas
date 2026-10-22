import { withAuth } from "next-auth/middleware";

// Protege as páginas. As rotas /api verificam a sessão por conta própria (respondem 401).
export default withAuth({ pages: { signIn: "/login" } });

export const config = {
  matcher: ["/((?!login|cadastro|api|_next/static|_next/image|favicon.ico).*)"],
};
