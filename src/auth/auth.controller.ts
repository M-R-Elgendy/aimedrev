import { Controller, Get, Post, Body, Headers, HttpCode, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';

import { EmailLogInDto } from './dto/email-login.dto';
import { EmailSignUpDto } from './dto/email-signup.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { EmailVerificationDto, SendOTPDto } from './dto/email-verification.dto';
import { OTPPasswordResetDto } from './dto/reset-password-otp.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { PasswordResetDto } from './dto/reset-password.dto';

import { AuthGuard } from 'src/auth/guards/auth.guard';
import { RoleGuard } from 'src/auth/guards/role.guard';
import { Roles } from '../global/decorators/role.decorator';
import { Role } from 'src/global/types';


@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post("/register")
  register(@Body() emailSignUpDto: EmailSignUpDto) {
    return this.authService.register(emailSignUpDto);
  }

  @HttpCode(200)
  @Post("/login")
  logIn(@Body() emailLogInDto: EmailLogInDto) {
    return this.authService.logIn(emailLogInDto);
  }

  @Post("/googleAuth")
  googleAuth(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleAuth(googleAuthDto);
  }

  @Get("/getUserFromToken")
  @UseGuards(AuthGuard)
  getUserFromToken(@Headers('Authorization') authHeader: string) {
    const token = authHeader.replace('Bearer ', '');
    return this.authService.getUserFromToken(token);
  }

  @Post("/resend-otp")
  resendOTP(@Body() sendOTPDto: SendOTPDto) {
    return this.authService.resendOTP(sendOTPDto);
  }

  @Post("/verify-email")
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.USER])
  verifyEmail(@Body() emailVerificationDto: EmailVerificationDto) {
    return this.authService.verifyEmail(emailVerificationDto);
  }

  @Post("forgot-password-email")
  resetPasswordRequest(@Body() resetPasswordRequestDto: ResetPasswordRequestDto) {
    return this.authService.resetPasswordRequest(resetPasswordRequestDto)
  }

  @Post("reset-password-email")
  resetPasswordWithCode(@Body() otpPasswordResetDto: OTPPasswordResetDto) {
    return this.authService.resetPasswordWithCode(otpPasswordResetDto)
  }

  @Post("reset-password")
  @UseGuards(AuthGuard, RoleGuard)
  @Roles([Role.USER])
  resetPassword(@Body() passwordResetDto: PasswordResetDto) {
    return this.authService.resetPassword(passwordResetDto)
  }

}
