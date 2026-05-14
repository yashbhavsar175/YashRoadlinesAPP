// Reusable Animated Components for Smooth UI
import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, View, StyleSheet, ViewStyle } from 'react-native';

interface FadeInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  style?: ViewStyle;
}

/**
 * Fade in animation component
 * Usage: <FadeInView><YourComponent /></FadeInView>
 */
export const FadeInView: React.FC<FadeInViewProps> = ({ 
  children, 
  duration = 300, 
  delay = 0,
  style 
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, duration, delay]);
  
  return (
    <Animated.View style={[style, { opacity: fadeAnim }]}>
      {children}
    </Animated.View>
  );
};

interface SlideInViewProps {
  children: React.ReactNode;
  direction?: 'left' | 'right' | 'up' | 'down';
  duration?: number;
  delay?: number;
  distance?: number;
  style?: ViewStyle;
}

/**
 * Slide in animation component
 * Usage: <SlideInView direction="left"><YourComponent /></SlideInView>
 */
export const SlideInView: React.FC<SlideInViewProps> = ({ 
  children, 
  direction = 'left',
  duration = 300,
  delay = 0,
  distance = 50,
  style 
}) => {
  const slideAnim = useRef(new Animated.Value(distance)).current;
  
  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [slideAnim, duration, delay]);
  
  const getTransform = () => {
    switch (direction) {
      case 'left':
        return [{ translateX: slideAnim }];
      case 'right':
        return [{ translateX: Animated.multiply(slideAnim, -1) }];
      case 'up':
        return [{ translateY: slideAnim }];
      case 'down':
        return [{ translateY: Animated.multiply(slideAnim, -1) }];
      default:
        return [{ translateX: slideAnim }];
    }
  };
  
  return (
    <Animated.View style={[style, { transform: getTransform() }]}>
      {children}
    </Animated.View>
  );
};

interface ScaleInViewProps {
  children: React.ReactNode;
  duration?: number;
  delay?: number;
  initialScale?: number;
  style?: ViewStyle;
}

/**
 * Scale in animation component
 * Usage: <ScaleInView><YourComponent /></ScaleInView>
 */
export const ScaleInView: React.FC<ScaleInViewProps> = ({ 
  children, 
  duration = 300,
  delay = 0,
  initialScale = 0.8,
  style 
}) => {
  const scaleAnim = useRef(new Animated.Value(initialScale)).current;
  
  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay,
      useNativeDriver: true,
    }).start();
  }, [scaleAnim, delay]);
  
  return (
    <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
      {children}
    </Animated.View>
  );
};

interface AnimatedButtonProps {
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  activeOpacity?: number;
  scaleValue?: number;
}

/**
 * Button with press animation
 * Usage: <AnimatedButton onPress={handlePress}>Button Text</AnimatedButton>
 */
export const AnimatedButton: React.FC<AnimatedButtonProps> = ({ 
  onPress, 
  children, 
  style,
  activeOpacity = 0.7,
  scaleValue = 0.95
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: scaleValue,
      useNativeDriver: true,
    }).start();
  };
  
  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 100,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };
  
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={activeOpacity}
    >
      <Animated.View style={[style, { transform: [{ scale: scaleAnim }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

/**
 * Skeleton loader for loading states
 * Usage: <SkeletonLoader width="100%" height={50} />
 */
export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  width = '100%', 
  height = 20,
  borderRadius = 8,
  style 
}) => {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [pulseAnim]);
  
  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#E0E0E0',
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

/**
 * Staggered list animation
 * Animates list items with delay
 */
export const useStaggeredAnimation = (itemCount: number, staggerDelay: number = 50) => {
  const animations = useRef(
    Array.from({ length: itemCount }, () => new Animated.Value(0))
  ).current;
  
  useEffect(() => {
    const animationSequence = animations.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * staggerDelay,
        useNativeDriver: true,
      })
    );
    
    Animated.stagger(staggerDelay, animationSequence).start();
  }, [animations, staggerDelay]);
  
  return animations;
};
