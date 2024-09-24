import { Injectable, HttpException, HttpStatus, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { compareSync, hashSync } from 'bcrypt';
import { PrismaClient, User } from '@prisma/client'
import { AxiosService } from '../axios/axios.service';
import { MailerService } from '@nestjs-modules/mailer';

import { EmailLogInDto } from './dto/email-login.dto';
import { EmailSignUpDto } from './dto/email-signup.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { EmailVerificationDto, SendOTPDto } from './dto/email-verification.dto';

import { UserService } from 'src/user/user.service';
import { Utlis } from 'src/global/utlis';
import { SessionToken } from '../global/types';
@Injectable()
export class AuthService {

  constructor(
    private readonly mailService: MailerService,
  ) { }
  private readonly jwtService: JwtService = new JwtService();
  private readonly prisma: PrismaClient = new PrismaClient();
  private readonly axiosService: AxiosService = new AxiosService();
  private readonly userService: UserService = new UserService();
  private readonly utils: Utlis = new Utlis();


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

      if (foundedUser) throw new ConflictException({ message: 'User already exists', foundedUser, status: HttpStatus.CONFLICT });

      const user = await this.prisma.user.create({
        data: {
          name: emailSignUpDto.name,
          email: emailSignUpDto.email,
          password: await this.hashPassword(emailSignUpDto.password),
          code: this.utils.generateOTP(+process.env.OTP_LENGTH || 6)
        }
      });

      await this.sendEmail(user.email, 'Verify your email', `Your verification code is ${user.code}`);
      const token = await this.jwtService.signAsync({ id: user.id, role: user.role }, { expiresIn: '30d', secret: process.env.JWT_SECRET });

      return {
        message: 'User created successfully',
        user: this.removeExtraAttrs([user])[0],
        token,
        status: HttpStatus.CREATED
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

      if (!user || user.socialProvider != null) throw new HttpException({ message: 'User not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (user.isBlocked) throw new HttpException({ message: 'User is blocked, please contact us', status: HttpStatus.FORBIDDEN }, HttpStatus.FORBIDDEN);

      const isPasswordMatch = await this.verifyPassword(emailLoginDto.password, user.password);
      if (!isPasswordMatch) throw new HttpException({ message: 'Invalid credentials', status: HttpStatus.UNAUTHORIZED }, HttpStatus.UNAUTHORIZED);

      const token = await this.jwtService.signAsync({ id: user.id, role: user.role }, { expiresIn: '30d', secret: process.env.JWT_SECRET });
      return { message: 'User logged in successfully', status: HttpStatus.OK, token };

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

      if (user && user?.socialProvider != 'google') throw new ConflictException({ message: 'User already exists please try to reset your password', status: HttpStatus.CONFLICT })

      if (user) {

        await this.updateGoogleData(googleUser.data.email, googleUser.data);
        if (user.isBlocked) throw new HttpException({ message: 'User is blocked, please contact us', status: HttpStatus.FORBIDDEN }, HttpStatus.FORBIDDEN);

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
      }

      const token = await this.jwtService.signAsync({ id: user.id, role: user.role }, { expiresIn: '30d', secret: process.env.JWT_SECRET });

      return { message: 'User created successfully', status: HttpStatus.CREATED, token };

    } catch (error) {
      throw error;
    }

  }

  async getUserFromToken(token: string) {

    if (!token) throw new HttpException({ message: 'Invalid token', status: HttpStatus.UNAUTHORIZED }, HttpStatus.UNAUTHORIZED);
    try {
      const tokenValue = token.replace('Bearer ', '');
      const decoded = await this.jwtService.verifyAsync(tokenValue, { secret: process.env.JWT_SECRET }) as SessionToken;

      const user = await this.userService.findOne(decoded.id);

      if (!user) throw new HttpException({ message: 'User not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (user.isBlocked) throw new HttpException({ message: 'User is blocked, please contact us', status: HttpStatus.FORBIDDEN }, HttpStatus.FORBIDDEN);

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

      if (!user || user?.socialProvider != null) throw new HttpException({ message: 'User not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (user.isBlocked) throw new HttpException({ message: 'User is blocked, please contact us', status: HttpStatus.FORBIDDEN }, HttpStatus.FORBIDDEN);
      if (user.emailVerified) throw new HttpException({ message: 'User already verified', status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);

      user.code = this.utils.generateOTP(+process.env.OTP_LENGTH || 6);
      await this.prisma.user.update({ where: { id: user.id }, data: { code: user.code } });

      await this.sendEmail(user.email, 'Verify your email', `Your verification code is ${user.code}`);

      return { message: 'OTP sent successfully', status: HttpStatus.OK };

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

      if (!user || user?.socialProvider != null) throw new HttpException({ message: 'User not found', status: HttpStatus.NOT_FOUND }, HttpStatus.NOT_FOUND);
      if (user.isBlocked) throw new HttpException({ message: 'User is blocked, please contact us', status: HttpStatus.FORBIDDEN }, HttpStatus.FORBIDDEN);
      if (user.code != emailVerificationDto.code) throw new HttpException({ message: 'Invalid code', status: HttpStatus.BAD_REQUEST }, HttpStatus.BAD_REQUEST);

      await this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true, code: null }
      });

      return { message: 'User verified successfully', status: HttpStatus.OK };

    } catch (error) {
      throw error;
    }

  }

  private async sendEmail(email: string, subject: string, text: string) {
    await this.mailService.sendMail({
      to: email,
      subject: subject,
      text: text
    });
  }

  private async hashPassword(password: string): Promise<string> {
    try {
      const hash = await hashSync(password, +process.env.SALT_ROUNDS);
      return hash;
    } catch (error) {
      throw new Error('Error hashing password');
    }
  }

  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      const isMatch = await compareSync(password, hash);
      return isMatch;
    } catch (error) {
      throw new Error('Error verifying password');
    }
  }

  private removeExtraAttrs(users: User[]) {

    return users.map(user => {
      delete user.password;
      delete user.code;
      delete user.createdAt;
      delete user.updatedAt;
      return user;
    });

  }

  private async updateGoogleData(email: string, googleData: any) {
    return await this.prisma.googleData.update({
      where: { email: email },
      data: googleData
    },);
  }
}
