declare module 'react-native-push-notification' {
  interface PushNotificationToken {
    os: string;
    token: string;
  }

  interface PushNotificationNotification {
    id?: string;
    title?: string;
    message?: string;
    userInfo?: any;
    data?: any;
    badge?: number;
    alert?: any;
    sound?: string;
    category?: string;
    contentIdentifier?: string;
    threadIdentifier?: string;
    launchImage?: string;
    action?: string;
    tag?: string;
    repeatType?: string;
    date?: Date;
  }

  interface PushNotificationConfiguration {
    onRegister?: (token: PushNotificationToken) => void;
    onNotification?: (notification: PushNotificationNotification) => void;
    onAction?: (notification: PushNotificationNotification) => void;
    onRegistrationError?: (err: Error) => void;
    permissions?: {
      alert?: boolean;
      badge?: boolean;
      sound?: boolean;
    };
    popInitialNotification?: boolean;
    requestPermissions?: boolean;
  }

  interface ChannelObject {
    channelId: string;
    channelName: string;
    channelDescription?: string;
    playSound?: boolean;
    soundName?: string;
    importance?: number;
    vibrate?: boolean;
  }

  interface LocalNotificationObject {
    channelId?: string;
    id?: string;
    title?: string;
    message?: string;
    playSound?: boolean;
    soundName?: string;
    importance?: string;
    vibrate?: boolean;
    autoCancel?: boolean;
    largeIcon?: string;
    smallIcon?: string;
    bigText?: string;
    subText?: string;
    userInfo?: any;
    tag?: string;
    group?: string;
    ongoing?: boolean;
    priority?: string;
    visibility?: string;
    ignoreInForeground?: boolean;
    shortcutId?: string;
    onlyAlertOnce?: boolean;
    when?: number;
    usesChronometer?: boolean;
    timeoutAfter?: number;
    messageId?: string;
    actions?: string[];
    invokeApp?: boolean;
    color?: string;
    number?: number;
    ticker?: string;
    showWhen?: boolean;
    allowWhileIdle?: boolean;
    largeIconUrl?: string;
    bigPictureUrl?: string;
    bigLargeIcon?: string;
    bigLargeIconUrl?: string;
    scheduleOnce?: boolean;
    alertAction?: string;
    category?: string;
    repeatType?: string;
    repeatTime?: number;
    date?: Date;
  }

  class PushNotification {
    static configure(options: PushNotificationConfiguration): void;
    static localNotification(details: LocalNotificationObject): void;
    static createChannel(channelObj: ChannelObject, callback?: (created: boolean) => void): void;
    static cancelAllLocalNotifications(): void;
    static requestPermissions(): Promise<any>;
  }

  export default PushNotification;
}