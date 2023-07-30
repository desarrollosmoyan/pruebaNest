import { InjectPubSub } from '@nestjs-query/query-graphql';
import { Injectable, Logger } from '@nestjs/common';
import { Args, ID, Subscription } from '@nestjs/graphql';
import { Point } from '@ridy/database';
import { RequestEntity } from '@ridy/database/request.entity';
import { RedisPubSub } from 'graphql-redis-subscriptions';
import { OrderDTO } from './dto/order.dto';

@Injectable()
export class OrderSubscriptionService {
  constructor(
    @InjectPubSub()
    private pubSub: RedisPubSub
  ) {}

  @Subscription(() => OrderDTO, {
    filter(
      this: OrderSubscriptionService,
      payload: { orderUpdated: RequestEntity },
      variables,
      context
    ) {
      Logger.log(payload.orderUpdated, `orderUpdated payload`);
      Logger.log(
        `validating order update on rider side: ${
          payload.orderUpdated.riderId == context.id
        }`
      );
      return context.id == payload.orderUpdated.riderId;
    },
    resolve: (payload: { orderUpdated: RequestEntity }) => {
      payload.orderUpdated.riderLastSeenMessagesAt = new Date(
        payload.orderUpdated.riderLastSeenMessagesAt
      );
      payload.orderUpdated.createdOn = new Date(payload.orderUpdated.createdOn);
      if (payload.orderUpdated.startTimestamp != null) {
        payload.orderUpdated.startTimestamp = new Date(
          payload.orderUpdated.startTimestamp
        );
      }
      if (payload.orderUpdated.finishTimestamp != null) {
        payload.orderUpdated.finishTimestamp = new Date(
          payload.orderUpdated.finishTimestamp
        );
      }

      payload.orderUpdated.driverLastSeenMessagesAt = new Date(
        payload.orderUpdated.driverLastSeenMessagesAt
      );
      payload.orderUpdated.expectedTimestamp = new Date(
        payload.orderUpdated.expectedTimestamp
      );
      return payload.orderUpdated;
    },
  })
  orderUpdated() {
    return this.pubSub.asyncIterator('orderUpdated');
  }

  @Subscription(() => Point, {
    filter(
      this: OrderSubscriptionService,
      payload: { driverLocationUpdated: { driverId: number; point: Point } },
      variables: { driverId: number },
      context
    ) {
      return variables.driverId == payload.driverLocationUpdated.driverId;
    },
  })
  driverLocationUpdated(
    @Args('driverId', { type: () => ID! }) driverId: number
  ) {
    return this.pubSub.asyncIterator('driverLocationUpdated');
  }
}
