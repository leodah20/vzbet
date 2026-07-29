import { Injectable } from '@nestjs/common';
import { Clock } from '../domain/clock.interface';

@Injectable()
export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}
