import { Body, Controller, Post, UseGuards, Req } from "@nestjs/common";
import { IsEmail, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import type { Request } from "express";

class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}

class ChangePasswordDto {
  @IsString() @MinLength(6) new_password!: string;
}

@Controller("auth")
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post("login")
  login(@Body() dto: LoginDto) { return this.auth.login(dto.email, dto.password); }

  @UseGuards(JwtAuthGuard)
  @Post("change-password")
  change(@Req() req: Request, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword((req.user as { sub: string }).sub, dto.new_password);
  }
}
