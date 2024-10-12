import { Injectable, HttpException, HttpStatus, ConflictException, NotFoundException, ForbiddenException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hashSync } from 'bcrypt';
import { PrismaClient, User } from '@prisma/client'
import { AxiosService } from '../axios/axios.service';
import { MailerService } from '@nestjs-modules/mailer';

import { EmailLogInDto } from './dto/email-login.dto';
import { EmailSignUpDto } from './dto/email-signup.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { EmailVerificationDto, SendOTPDto } from './dto/email-verification.dto';
import { OTPPasswordResetDto } from './dto/reset-password-otp.dto';
import { ResetPasswordRequestDto } from './dto/reset-password-request.dto';
import { PasswordResetDto } from './dto/reset-password.dto';

import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
import { SessionToken } from '../global/types';
import { AuthContext } from './auth.context';
import { StripeService } from 'src/stripe/stripe.service';
@Injectable()
export class AuthService {

  constructor(
    private readonly mailService: MailerService,
    private readonly authContext: AuthContext,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaClient,
    private readonly axiosService: AxiosService,
    private readonly utils: Utlis,
    private readonly stripeService: StripeService
  ) { }



  async register(emailSignUpDto: EmailSignUpDto) {
    try {

      const foundedUser = await this.prisma.user.findFirst({
        where: {
          email: emailSignUpDto.email,
          isDeleted: false
        },
        select: {
          name: true,
          email: true,
          createdAt: true
        }
      });

      if (foundedUser) throw new ConflictException({ message: 'User already exists', foundedUser, statusCode: HttpStatus.CONFLICT });

      const user = await this.prisma.user.create({
        data: {
          name: emailSignUpDto.name,
          email: emailSignUpDto.email,
          password: await this.hashPassword(emailSignUpDto.password),
          code: this.utils.generateRandomNumber(+process.env.OTP_LENGTH || 6)
        }
      });
      const stripeCustomerId = await this.createStripeCustomer(user);
      await this.prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: stripeCustomerId }
      });


      await this.sendEmail(user.email, 'Verify your email', `Your verification code is ${user.code}`);
      const token = await this.jwtService.signAsync({ id: user.id, role: user.role }, { expiresIn: '30d', secret: process.env.JWT_SECRET });

      return {
        message: 'User created successfully',
        user: this.removeExtraAttrs([user])[0],
        token,
        statusCode: HttpStatus.CREATED
      };

    } catch (error) {
      throw error;
    }
  }

  async logIn(emailLoginDto: EmailLogInDto) {

    try {
      const user = await this.prisma.user.findFirst({
        where: {
          email: emailLoginDto.email,
          isDeleted: false
        },
        select: {
          id: true,
          name: true,
          countryId: true,
          speciality: true,
          createdAt: true,
          email: true,
          phone: true,
          password: true,
          socialProvider: true,
          isBlocked: true,
          role: true
        }
      });

      if (!user || user.socialProvider != null) throw new NotFoundException('User not found');
      if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact support team')

      const isPasswordMatch = await this.verifyPassword(emailLoginDto.password, user.password);
      if (!isPasswordMatch) throw new UnauthorizedException('Invalid credentials')

      const token = await this.jwtService.signAsync({ id: user.id, role: user.role }, { expiresIn: '30d', secret: process.env.JWT_SECRET });
      return { message: 'User logged in successfully', statusCode: HttpStatus.OK, token };

    } catch (error) {
      throw error;
    }

  }

  async googleAuth(googleAuthDto: GoogleAuthDto) {

    try {
      const accessToken = googleAuthDto.accessToken;

      const headers = {
        "Content-Type": "application/json",
        'Authorization': `Bearer ${accessToken}`
      };
      const googleUser = await this.axiosService.get(process.env.GOOGLE_AUTH_URL, headers);

      if (googleUser.status !== 200) throw new HttpException({ message: "Invalid token", status: googleUser.status }, googleUser.status);

      let user = await this.prisma.user.findFirst({
        where: {
          email: googleUser.data.email,
          isDeleted: false
        },
        select: {
          id: true,
          name: true,
          countryId: true,
          speciality: true,
          createdAt: true,
          email: true,
          phone: true,
          socialProvider: true,
          isBlocked: true,
          role: true
        }
      });

      if (user && user?.socialProvider != 'google') throw new ConflictException('User already exists please try to reset your password')

      if (user) {

        await this.updateGoogleData(googleUser.data.email, googleUser.data);
        if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact us');

      } else {
        const userData = await this.prisma.googleData.create({ data: googleUser.data });
        user = await this.prisma.user.create({
          data: {
            name: googleUser.data.name,
            email: googleUser.data.email,
            socialProvider: "google",
            password: null,
            emailVerified: true,
            googleDataId: userData.id
          }
        });
        const stripeCustomerId = await this.createStripeCustomer(user as User);
        await this.prisma.user.update({
          where: { id: user.id },
          data: { stripeCustomerId: stripeCustomerId }
        });
      }

      const token = await this.jwtService.signAsync({ id: user.id, role: user.role }, { expiresIn: '30d', secret: process.env.JWT_SECRET });

      return { message: 'User created successfully', statusCode: HttpStatus.CREATED, token };

    } catch (error) {
      throw error;
    }

  }

  async getUserFromToken(token: string) {

    if (!token) throw new UnauthorizedException('Invalid token');
    try {
      const tokenValue = token.replace('Bearer ', '');
      const decoded = await this.jwtService.verifyAsync(tokenValue, { secret: process.env.JWT_SECRET }) as SessionToken;

      const user = (await this.userService.findOne(decoded.id))?.data || null;

      if (!user) throw new NotFoundException('User not found');
      if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact support team')

      return user;
    } catch (error) {
      throw error;
    }

  }

  async resendOTP(sendOTPDto: SendOTPDto) {

    try {

      const user = await this.prisma.user.findFirst({
        where: {
          email: sendOTPDto.email,
          isDeleted: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          code: true,
          createdAt: true,
          socialProvider: true,
          isBlocked: true,
          emailVerified: true
        }
      });

      if (!user || user?.socialProvider != null) throw new NotFoundException('User not found');
      if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact support team')
      if (user.emailVerified) throw new BadRequestException('User already verified');

      user.code = this.utils.generateRandomNumber(+process.env.OTP_LENGTH || 6);

      await this.prisma.user.update({ where: { id: user.id }, data: { code: user.code } });

      await this.sendEmail(user.email, 'Verify your email', `Your verification code is ${user.code}`);

      return { message: 'OTP sent successfully', statusCode: HttpStatus.OK };

    } catch (error) {
      throw error;
    }

  }

  async verifyEmail(emailVerificationDto: EmailVerificationDto) {

    try {

      const user = await this.prisma.user.findFirst({
        where: {
          email: emailVerificationDto.email,
          isDeleted: false
        },
        select: {
          id: true,
          code: true,
          socialProvider: true,
          isBlocked: true,
          emailVerified: true
        }
      });

      if (!user || user?.socialProvider != null) throw new NotFoundException('User not found');
      if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact support team')
      if (user.code != emailVerificationDto.code) throw new BadRequestException('Invalid code');

      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, code: null }
      });

      return { message: 'User verified successfully', statusCode: HttpStatus.OK };

    } catch (error) {
      throw error;
    }

  }

  async resetPasswordRequest(resetPasswordRequestDto: ResetPasswordRequestDto) {

    try {

      const user = await this.prisma.user.findFirst({
        where: {
          email: resetPasswordRequestDto.email,
          isDeleted: false
        },
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
          socialProvider: true,
          isBlocked: true
        }
      });

      if (!user || user?.socialProvider != null) throw new NotFoundException('User not found');
      if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact support team');

      const code = this.utils.generateRandomNumber(+process.env.OTP_LENGTH || 6);

      await this.prisma.user.update({ where: { id: user.id }, data: { code: code } });

      await this.sendEmail(user.email, 'Reset your password', `Your reset code is ${code}`);

      return { message: 'Reset code sent successfully', statusCode: HttpStatus.OK };

    } catch (error) {
      throw error;
    }

  }

  async resetPasswordWithCode(otpPasswordResetDto: OTPPasswordResetDto) {

    try {

      const user = await this.prisma.user.findFirst({
        where: {
          email: otpPasswordResetDto.email,
          isDeleted: false
        },
        select: {
          id: true,
          code: true,
          socialProvider: true,
          isBlocked: true,
        }
      });

      if (!user || user?.socialProvider != null) throw new NotFoundException('User not found');
      if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact support team');
      if (user.code != otpPasswordResetDto.otp) throw new BadRequestException('Invalid code');

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: await this.hashPassword(otpPasswordResetDto.password), code: null }
      });

      return { message: 'Password reset successfully', statusCode: HttpStatus.OK };

    } catch (error) {
      throw error;
    }

  }

  async resetPassword(passwordResetDto: PasswordResetDto) {

    try {

      if (passwordResetDto.newPassword == passwordResetDto.oldPassword) throw new BadRequestException('New password cannot be the same as the old password');

      const user = await this.prisma.user.findFirst({
        where: {
          id: this.authContext.getUser().id,
          isDeleted: false
        },
        select: {
          id: true,
          socialProvider: true,
          isBlocked: true,
          password: true
        }
      });

      if (!user || user?.socialProvider != null) throw new NotFoundException('User not found');
      if (user.isBlocked) throw new ForbiddenException('User is blocked, please contact support team');
      if (!await this.verifyPassword(passwordResetDto.oldPassword, user.password)) throw new BadRequestException('Invalid old password');

      await this.prisma.user.update({
        where: { id: user.id },
        data: { password: await this.hashPassword(passwordResetDto.newPassword) }
      });

      return { message: 'Password reset successfully', statusCode: HttpStatus.OK };

    } catch (error) {
      throw error;
    }

  }

  private async sendEmail(email: string, subject: string, text: string): Promise<void> {
    await this.mailService.sendMail({
      to: email,
      subject: subject,
      text: text
    });
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      const hash = hashSync(password, +process.env.SALT_ROUNDS);
      return hash;
    } catch (error) {
      throw new Error('Error hashing password');
    }
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isMatch = compareSync(password, hash);
      return isMatch;
    } catch (error) {
      throw new Error('Error verifying password');
    }
  }

  private removeExtraAttrs(users: User[]): Partial<User[]> {

    return users.map(user => {
      delete user.password;
      delete user.code;
      delete user.createdAt;
      delete user.updatedAt;
      delete user.stripeCustomerId;
      return user;
    });

  }

  private async updateGoogleData(email: string, googleData: any) {
    return await this.prisma.googleData.update({
      where: { email: email },
      data: googleData
    },);
  }

  private async createStripeCustomer(user: User): Promise<string> {
    const customer = await this.stripeService.createCustomer({
      email: user.email,
      name: user.name,
      metadata: {
        userId: user.id,
        socialProvider: user.socialProvider,
      }
    });

    console.log(customer)
    return customer.id;
  }
}
