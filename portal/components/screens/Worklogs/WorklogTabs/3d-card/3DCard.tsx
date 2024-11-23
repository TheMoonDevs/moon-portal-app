import React, { useRef } from 'react';
import './Card.css';

const Card = ({ children }: { children: React.ReactNode }) => {
  const cardRef = useRef<HTMLDivElement | null>(null);

  const handleMouseEnter = () => {
    const card = cardRef.current;
    if (!card) return;

    const bounds = card.getBoundingClientRect();

    const rotateToMouse = (e: MouseEvent) => {
      const mouseX = e.clientX;
      const mouseY = e.clientY;
      const leftX = mouseX - bounds.x;
      const topY = mouseY - bounds.y;
      const center = {
        x: leftX - bounds.width / 2,
        y: topY - bounds.height / 2,
      };
      const distance = Math.sqrt(center.x ** 2 + center.y ** 2);

      card.style.transform = `
        scale3d(1.07, 1.07, 1.07)
        rotate3d(
          ${center.y / 100},
          ${-center.x / 100},
          0,
          ${Math.log(distance) * 2}deg
        )
      `;

      const glowElement = card.querySelector('.glow') as HTMLElement;
      if (glowElement) {
        glowElement.style.backgroundImage = `
          radial-gradient(
            circle at
            ${center.x * 2 + bounds.width / 2}px
            ${center.y * 2 + bounds.height / 2}px,
            #ffffff55,
            #0000000f
          )
        `;
      }
    };

    const handleMouseLeave = () => {
      document.removeEventListener('mousemove', rotateToMouse);
      card.style.transform = '';
      const glowElement = card.querySelector('.glow') as HTMLElement;
      if (glowElement) {
        glowElement.style.backgroundImage = '';
      }
    };

    document.addEventListener('mousemove', rotateToMouse);
    card.addEventListener('mouseleave', handleMouseLeave, { once: true });
  };

  return (
    <div ref={cardRef} className="card mx-2" onMouseEnter={handleMouseEnter}>
      <div className="glow"></div>
      {children}
    </div>
  );
};

export default Card;
