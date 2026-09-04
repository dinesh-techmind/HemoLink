#!/bin/bash
FILES="src/components/DonorIdentityPassModal.tsx"
for file in $FILES; do
  sed -i 's/bg-zinc-800/bg-surface-dark/g' $file
  sed -i 's/bg-zinc-900/bg-surface-dark/g' $file
  sed -i 's/bg-zinc-950/bg-surface-dark/g' $file
  sed -i 's/border-zinc-800/border-border-dark/g' $file
  sed -i 's/border-zinc-700/border-border-dark/g' $file
  sed -i 's/text-zinc-300/text-text-bright/g' $file
  sed -i 's/text-zinc-400/text-text-muted/g' $file
  sed -i 's/text-zinc-500/text-text-subtle/g' $file
  sed -i 's/text-white/text-text-bright/g' $file
  sed -i 's/bg-black\/80/bg-surface-dark\/40/g' $file
  sed -i 's/text-text-bright font-display/text-white font-display/g' $file
  sed -i 's/bg-brand-red text-text-bright/bg-brand-red text-white/g' $file
done
