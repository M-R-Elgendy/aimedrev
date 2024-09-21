import { Controller, Get, Post, Body, Headers, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { EmailLogInDto } from './dto/email-login.dto';
import { EmailSignUpDto } from './dto/email-signup.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { EmailVerificationDto, SendOTPDto } from './dto/email-verification.dto';
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
  getUserFromToken(@Headers('Authorization') authHeader: string) {
    const token = authHeader.replace('Bearer ', '');
    return this.authService.getUserFromToken(token);
  }

  @Post("/resend-otp")
  resendOTP(@Body() sendOTPDto: SendOTPDto) {
    return this.authService.resendOTP(sendOTPDto);
  }

  @Post("/verify-email")
  verifyEmail(@Body() emailVerificationDto: EmailVerificationDto) {
    return this.authService.verifyEmail(emailVerificationDto);
  }

}
