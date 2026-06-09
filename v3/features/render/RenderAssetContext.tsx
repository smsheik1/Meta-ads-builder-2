import {
  createContext,
  type ComponentType,
  type CSSProperties,
  type ReactNode,
  useContext,
} from "react";

export type RenderImageComponent = ComponentType<{
  alt?: string;
  src: string;
  style?: CSSProperties;
}>;

const defaultImageComponent = "img" as unknown as RenderImageComponent;

const RenderAssetContext = createContext({
  Image: defaultImageComponent,
});

export function RenderAssetProvider({
  children,
  Image,
}: {
  children: ReactNode;
  Image: RenderImageComponent;
}) {
  return (
    <RenderAssetContext.Provider value={{ Image }}>
      {children}
    </RenderAssetContext.Provider>
  );
}

export function useRenderAssetComponents() {
  return useContext(RenderAssetContext);
}
