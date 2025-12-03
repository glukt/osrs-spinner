import React, { useEffect, useState } from 'react';
import { motion, useAnimation, useMotionValue } from 'framer-motion';
import { Task } from './types';

interface WheelCanvasProps {
    tasks: Task[];
    isSpinning: boolean;
    onSpinComplete: (winner: Task) => void;
    spinTriggerToken: number; // Used to trigger re-spins from outside
}

const WheelCanvas: React.FC<WheelCanvasProps> = ({ tasks, isSpinning, onSpinComplete, spinTriggerToken }) => {
    const controls = useAnimation();
    const rotation = useMotionValue(0);
    const [lastRotation, setLastRotation] = useState(0);

    const size = 400; // Wheel size in px
    const center = size / 2;
    const radius = size / 2 - 20; // bezel width

    const sliceAngle = 360 / (tasks.length || 1);

    // --- SVG Maths ---
    // Helper to convert degrees to radians
    const degToRad = (deg: number) => (deg * Math.PI) / 180;

    // Helper to calculate coordinates on the circle circumference
    const getCoordinatesForPercent = (percent: number) => {
        const x = center + radius * Math.cos(2 * Math.PI * percent);
        const y = center + radius * Math.sin(2 * Math.PI * percent);
        return [x, y];
    };

    // Generate the SVG path for a single pie slice
    const getSlicePath = (idx: number, total: number) => {
        const startAngle = (idx / total);
        const endAngle = ((idx + 1) / total);
        const [startX, startY] = getCoordinatesForPercent(startAngle);
        const [endX, endY] = getCoordinatesForPercent(endAngle);
        const largeArcFlag = endAngle - startAngle > 0.5 ? 1 : 0;

        // SVG Path commands: Move to center, Line to start, Arc to end, Close path
        return `M ${center} ${center} L ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${endX} ${endY} Z`;
    };
    // -----------------


    // --- Trigger Spin ---
    useEffect(() => {
        if (spinTriggerToken > 0 && tasks.length > 0) {
            const newTargetRotation = lastRotation + 3600 + Math.random() * 360; // At least 10 full spins + random

            controls.start({
                rotate: newTargetRotation,
                transition: {
                    duration: 8,
                    // Physics-based ease for realistic "heavy wheel" feel
                    ease: [0.12, 0.8, 0.08, 1.0]
                }
            }).then(() => {
                // Animation complete
                setLastRotation(newTargetRotation);
                calculateWinner(newTargetRotation);
            });
        }
    }, [spinTriggerToken]);


    const calculateWinner = (finalAngle: number) => {
        // Normalize angle to 0-360
        const normalizedAngle = finalAngle % 360;

        // The pointer is at 3 o'clock (90 degrees clockwise from 12 o'clock).
        // The wheel starts with index 0 at 12 o'clock (due to -90 rotation).
        // So if rotation is 0, the pointer is at 90 degrees relative to the wheel start.
        // The slice at the pointer is the one covering the angle (90 - rotation).

        // We need to find the angle on the wheel that is currently at the 3 o'clock position.
        // AngleAtPointer = (90 - normalizedAngle)
        // We normalize this to [0, 360)
        let angleAtPointer = (90 - normalizedAngle) % 360;
        if (angleAtPointer < 0) angleAtPointer += 360;

        const winningIndex = Math.floor(angleAtPointer / sliceAngle);

        if (tasks[winningIndex]) {
            onSpinComplete(tasks[winningIndex]);
        }
    };

    if (tasks.length === 0) {
        return <div className="w-[400px] h-[400px] rounded-full bg-osrs-panel border-4 border-osrs-border flex items-center justify-center text-osrs-gold opacity-50">Add tasks to spin</div>
    }

    return (
        <div className="relative w-[400px] h-[400px] flex items-center justify-center">
            {/* The Stopper/Pointer (pointing at 3 o'clock) */}
            <div className="absolute right-[-10px] top-1/2 -translate-y-1/2 z-20 w-0 h-0 
          border-t-[15px] border-t-transparent
          border-b-[15px] border-b-transparent
          border-r-[25px] border-r-osrs-gold drop-shadow-lg"></div>

            <motion.div
                className="w-full h-full rounded-full overflow-hidden shadow-bezel relative z-10 border-8 border-osrs-panel"
                animate={controls}
                style={{ rotate: rotation }}
            >
                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                    <g transform={`rotate(-90 ${center} ${center})`}> {/* Rotate -90 so slice 0 starts at top before spinning */}
                        {tasks.map((task, i) => {
                            // Calculate text position exactly in the middle of the slice
                            const angleMidpoint = (i * sliceAngle) + (sliceAngle / 2);
                            const textRadius = radius * 0.65; // Push text out towards edge
                            const tx = center + textRadius * Math.cos(degToRad(angleMidpoint));
                            const ty = center + textRadius * Math.sin(degToRad(angleMidpoint));

                            return (
                                <g key={task.id}>
                                    <path
                                        d={getSlicePath(i, tasks.length)}
                                        fill={task.color}
                                        stroke="#3c352d"
                                        strokeWidth="2"
                                    />
                                    {/* Slice Text */}
                                    <text
                                        x={tx}
                                        y={ty}
                                        fill="white"
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize="14"
                                        fontWeight="bold"
                                        style={{ textShadow: '1px 1px 2px black' }}
                                        // Rotate text so it's readable outward from center
                                        transform={`rotate(${angleMidpoint} ${tx} ${ty})`}
                                    >
                                        {task.name}
                                        <tspan x={tx} dy="1.2em" fontSize="10" opacity="0.8">
                                            {task.currentGoal} {task.metric}
                                            {task.multiplier > 1 && <tspan fill="#ffdd00"> (x{task.multiplier})</tspan>}
                                        </tspan>
                                    </text>
                                </g>
                            )
                        })}
                    </g>
                    {/* Center hub cap */}
                    <circle cx={center} cy={center} r={radius / 5} fill="#3c352d" stroke="#5b4028" strokeWidth="4" />
                    <circle cx={center} cy={center} r={radius / 8} fill="#1e2124" />
                </svg>
            </motion.div>
        </div>
    );
};

export default WheelCanvas;
