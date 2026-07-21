import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma.service";

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException("Invalid credentials");
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) throw new UnauthorizedException("Invalid credentials");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const access_token = await this.jwt.signAsync({
      sub: user.id,
      org_id: user.org_id,
      is_superadmin: user.is_superadmin,
    });

    const { password_hash, ...safe } = user;
    return { access_token, user: safe };
  }

  async changePassword(userId: string, newPassword: string) {
    const password_hash = await bcrypt.hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password_hash, require_password_reset: false },
    });
    return { ok: true };
  }
}
