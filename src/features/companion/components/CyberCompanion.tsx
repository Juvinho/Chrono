import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from '../../../hooks/useTranslation';
import { apiClient } from '../../../api';
import { generateCompanionReaction } from '../../../utils/geminiService';

import { Notification } from '../../../types/index';

interface CyberCompanionProps {
  notifications: Notification[];
}

interface CompanionData {
  id: string;
  name: string;
  type: 'robot' | 'hologram' | 'drone';
  level: number;
  xp: number;
  mood: 'happy' | 'neutral' | 'sad' | 'excited' | 'sleepy';
}

export default function CyberCompanion({ notifications }: CyberCompanionProps) {
  const [companion, setCompanion] = useState<CompanionData | null>(null);
  const [mood, setMood] = useState<'idle' | 'happy' | 'alert' | 'sleep'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastProcessedIdRef = useRef<string | null>(null);
  const { t } = useTranslation();

  const unreadCount = notifications.filter(n => !n.read).length;

  // Fetch or create companion
  useEffect(() => {
    const fetchCompanion = async () => {
      const res = await apiClient.getCompanion();
      if (res.data) {
        setCompanion(res.data);
      } else {
        // Auto-create if not exists
        const createRes = await apiClient.createCompanion('ChronoBot', 'robot');
        if (createRes.data) {
          setCompanion(createRes.data);
        }
      }
    };
    fetchCompanion();
  }, []);

  // Sync mood with backend data if available, otherwise use local logic
  useEffect(() => {
    if (companion?.mood) {
       // Map backend mood to frontend mood
       // backend: 'happy' | 'neutral' | 'sad' | 'excited' | 'sleepy'
       // frontend: 'idle' | 'happy' | 'alert' | 'sleep'
       switch(companion.mood) {
           case 'happy': setMood('happy'); break;
           case 'excited': setMood('happy'); break;
           case 'sleepy': setMood('sleep'); break;
           default: setMood('idle');
       }
    }
  }, [companion]);

  // Mood logic based on notifications override
  useEffect(() => {
    const processNotification = async () => {
        if (unreadCount > 0) {
            setMood('alert');

            const latest = notifications.find(n => !n.read);
            
            // Only generate reaction if it's a new notification we haven't seen in this session
            if (latest && latest.id !== lastProcessedIdRef.current) {
                lastProcessedIdRef.current = latest.id;

                if (latest.actor) {
                    let reactionMsg: string | null = null;
                    
                    // Try AI generation
                    try {
                        reactionMsg = await generateCompanionReaction(
                            latest.notificationType,
                            latest.actor.username,
                            latest.post?.content
                        );
                    } catch (e) {
                        console.error("AI reaction failed", e);
                    }

                    if (reactionMsg) {
                        setMessage(reactionMsg);
                    } else {
                        // Fallback logic
                        const actor = latest.actor.username;
                        let msg = `${unreadCount} new alerts!`;
                        switch (latest.notificationType) {
                            case 'reply': msg = `${actor} replied to you!`; break;
                            case 'reaction': msg = `${actor} reacted!`; break;
                            case 'follow': msg = `${actor} followed you!`; break;
                            case 'mention': msg = `${actor} mentioned you!`; break;
                            case 'repost': msg = `${actor} echoed you!`; break;
                            case 'directMessage': msg = `Message from ${actor}!`; break;
                        }
                        setMessage(msg);
                    }

                    setTimeout(() => setMessage(null), 6000);
                }
            }
        } else if (companion) {
            // Revert to companion mood
            switch(companion.mood) {
                case 'happy': setMood('happy'); break;
                case 'excited': setMood('happy'); break;
                case 'sleepy': setMood('sleep'); break;
                default: setMood('idle');
            }
        }
    };

    processNotification();
  }, [unreadCount, notifications, companion]);

  const handleInteract = async () => {
      // Toggle mood locally for feedback
      setMood(m => m === 'idle' ? 'happy' : 'idle');
      
      // Send interaction to backend
      const res = await apiClient.interactWithCompanion('pet');
      if (res.data) {
          setCompanion(res.data); // Update with new XP/Level
          setMessage(`XP: ${res.data.xp} | Lvl: ${res.data.level}`);
          setTimeout(() => setMessage(null), 2000);
      }
  };

  // Animation Loop (Simple Canvas Drawing)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw Robot Body (Hologram style)
      ctx.strokeStyle = '#00ffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ffff';
      ctx.lineWidth = 2;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2 + Math.sin(frame * 0.05) * 5; // Hovering effect

      // Head
      ctx.beginPath();
      ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
      ctx.stroke();

      // Eyes
      ctx.fillStyle = mood === 'alert' ? '#ff0000' : '#00ffff';
      ctx.shadowColor = mood === 'alert' ? '#ff0000' : '#00ffff';
      
      if (mood === 'sleep') {
          ctx.beginPath();
          ctx.moveTo(centerX - 8, centerY - 2);
          ctx.lineTo(centerX - 2, centerY - 2);
          ctx.moveTo(centerX + 2, centerY - 2);
          ctx.lineTo(centerX + 8, centerY - 2);
          ctx.stroke();
      } else {
          // Left Eye
          ctx.beginPath();
          ctx.arc(centerX - 5, centerY - 2, 3, 0, Math.PI * 2);
          ctx.fill();
          // Right Eye
          ctx.beginPath();
          ctx.arc(centerX + 5, centerY - 2, 3, 0, Math.PI * 2);
          ctx.fill();
      }

      // Mouth
      ctx.beginPath();
      if (mood === 'happy') {
        ctx.arc(centerX, centerY + 5, 8, 0, Math.PI, false);
      } else if (mood === 'alert') {
        ctx.moveTo(centerX - 5, centerY + 8);
        ctx.lineTo(centerX + 5, centerY + 8);
      } else {
        ctx.moveTo(centerX - 3, centerY + 8);
        ctx.lineTo(centerX + 3, centerY + 8);
      }
      ctx.stroke();

      // Scanline effect
      ctx.fillStyle = `rgba(0, 255, 255, 0.1)`;
      ctx.fillRect(0, (frame % canvas.height), canvas.width, 2);

      frame++;
      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [mood]);

  return (
    <div className="fixed bottom-4 right-4 z-50 pointer-events-none flex flex-col items-end">
      {message && (
        <div className="bg-black/80 border border-[var(--theme-primary)] text-[var(--theme-primary)] px-3 py-1 rounded-lg mb-2 text-sm backdrop-blur-sm animate-fade-in-up">
          {message}
        </div>
      )}
      <div 
        className="cursor-pointer pointer-events-auto transition-transform hover:scale-110 active:scale-95"
        onClick={() => setMood(m => m === 'idle' ? 'happy' : 'idle')}
      >
        <canvas ref={canvasRef} width={100} height={100} />
      </div>
    </div>
  );
}
