declare module '@env' {
  export const GEMINI_API_KEY: string;
  export const GROQ_API_KEY: string;
}

declare module 'react-native-vector-icons/MaterialCommunityIcons' {
  import { ComponentType } from 'react';
  import { TextProps } from 'react-native';

  type IconProps = TextProps & {
    name: string;
    size?: number;
    color?: string;
  };

  const Icon: ComponentType<IconProps>;
  export default Icon;
}
