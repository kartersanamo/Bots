import { cn, discordAvatarUrl } from "@/lib/utils";
import Image from "next/image";

interface AvatarProps {
  userId: string;
  avatarHash: string | null;
  size?: number;
  className?: string;
  alt?: string;
}

export function Avatar({
  userId,
  avatarHash,
  size = 32,
  className,
  alt = "Avatar",
}: AvatarProps) {
  const src = discordAvatarUrl(userId, avatarHash, size * 2);

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-full ring-2 ring-accent/20",
        className
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        unoptimized
      />
    </div>
  );
}
