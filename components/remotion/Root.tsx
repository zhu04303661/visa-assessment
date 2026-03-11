"use client"

import { Composition } from "remotion"
import { HeroAnimation, heroAnimationConfig } from "./compositions/HeroAnimation"
import { GTVProcessAnimation, gtvProcessAnimationConfig } from "./compositions/GTVProcessAnimation"

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id={heroAnimationConfig.id}
        component={HeroAnimation}
        durationInFrames={heroAnimationConfig.durationInFrames}
        fps={heroAnimationConfig.fps}
        width={heroAnimationConfig.width}
        height={heroAnimationConfig.height}
      />
      <Composition
        id={gtvProcessAnimationConfig.id}
        component={GTVProcessAnimation}
        durationInFrames={gtvProcessAnimationConfig.durationInFrames}
        fps={gtvProcessAnimationConfig.fps}
        width={gtvProcessAnimationConfig.width}
        height={gtvProcessAnimationConfig.height}
      />
    </>
  )
}
