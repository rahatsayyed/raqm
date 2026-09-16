import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type IconProps = {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  size?: number;
  color: string;
};

// Single wrapper so every screen imports one component, not the icon
// library directly — matches DESIGN.md v2.0 §8 (one icon set, no emoji,
// no hand-rolled SVGs). See this file's Task 2 note on why
// MaterialCommunityIcons stands in for "Material Symbols Outlined."
export function Icon({ name, size = 20, color }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}
