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
    console.log("WheelCanvas rendering with tasks:", tasks.length);
    const controls = useAnimation();
    const rotation = useMotionValue(0);
    const [lastRotation, setLastRotation] = useState(0);

    // Track the last processed token to prevent auto-spin on remount
    const prevSpinToken = React.useRef(spinTriggerToken);

    const size = 500; // Wheel size in px (matches container)
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
        // Only spin if the token has changed and is greater than the last processed one
        // This prevents spinning on mount if the token is already positive
        if (spinTriggerToken > 0 && spinTriggerToken !== prevSpinToken.current && tasks.length > 0) {
            prevSpinToken.current = spinTriggerToken;
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
        } else {
            // If we're mounting with an existing token, just sync the ref
            prevSpinToken.current = spinTriggerToken;
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
        <div className="relative w-[500px] h-[500px] flex items-center justify-center perspective-1000">
            {/* Outer Bezel/Rim with 3D depth */}
            <div className="absolute inset-0 rounded-full border-[16px] border-red-900/80 shadow-[0_0_50px_rgba(220,38,38,0.2),inset_0_0_20px_rgba(0,0,0,0.8)] z-10 pointer-events-none transform translate-z-10"></div>

            <motion.div
                className="w-full h-full rounded-full relative preserve-3d"
                animate={controls}
                style={{
                    rotate: rotation,
                    filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.5))',
                    transformStyle: 'preserve-3d',
                    opacity: isSpinning ? 0.9 : 1
                }}
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
                                        transform={`rotate(${angleMidpoint + (angleMidpoint > 90 && angleMidpoint < 270 ? 180 : 0)} ${tx} ${ty})`}
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
                </svg>
            </motion.div>

            {/* Center Hub Cap (Static) */}
            <div className="absolute w-16 h-16 bg-gradient-to-br from-red-900 to-black rounded-full shadow-[0_5px_15px_rgba(0,0,0,0.8)] z-20 flex items-center justify-center border-4 border-red-950">
                <div className="w-8 h-8 bg-red-950 rounded-full shadow-inner"></div>
            </div>

            {/* The Stopper/Pointer (pointing at 3 o'clock) */}
            <div className="absolute right-[-20px] top-1/2 -translate-y-1/2 z-30 filter drop-shadow-lg">
                <div className="w-0 h-0 
              border-t-[15px] border-t-transparent
              border-b-[15px] border-b-transparent
              border-r-[30px] border-r-red-600 drop-shadow-[0_0_10px_rgba(220,38,38,0.8)]"></div>
            </div>
        </div>
    );
};

export default WheelCanvas;
