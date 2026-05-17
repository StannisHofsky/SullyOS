import React, { useEffect, useState } from 'react';

/**
 * 构建版本指示器：右下角显示
 *   sw@<SW_VERSION>           ← 上面一行
 *   <branch>@<shortHash>      ← 下面一行
 *
 * - 仅当 vite.config 注入的 __BUILD_BADGE_VISIBLE__ 为 true 时挂载
 *   （VITE_HIDE_BUILD_BADGE=1 时构建会把它编译成 false → 树摇掉）
 * - SW 版本通过 MessageChannel postMessage GET_SW_VERSION 查询；SW 未注册 /
 *   不响应时显示 sw@?
 * - pointer-events-none + select-none：不可点、不可选、不影响下层交互
 * - z-[2147483647]：保证盖在所有 modal / 动画 / 全屏覆盖层之上
 * - safe-area-inset：iOS PWA 底部 home indicator 区域避让
 */
async function querySwVersion(): Promise<string> {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return '?';
    try {
        const reg = await navigator.serviceWorker.ready;
        const target = reg.active || reg.waiting || reg.installing;
        if (!target) return '?';
        return await new Promise<string>((resolve) => {
            const channel = new MessageChannel();
            const timer = setTimeout(() => resolve('?'), 1500);
            channel.port1.onmessage = (e) => {
                clearTimeout(timer);
                resolve(e.data?.version ?? '?');
            };
            target.postMessage({ type: 'GET_SW_VERSION' }, [channel.port2]);
        });
    } catch {
        return '?';
    }
}

const BuildBadge: React.FC = () => {
    if (!__BUILD_BADGE_VISIBLE__) return null;

    const buildLabel = `${__BUILD_BRANCH__}@${__BUILD_COMMIT__}`;
    const [swVersion, setSwVersion] = useState<string>('…');

    useEffect(() => {
        let cancelled = false;
        querySwVersion().then((v) => { if (!cancelled) setSwVersion(v); });
        return () => { cancelled = true; };
    }, []);

    return (
        <div
            aria-hidden
            className="fixed pointer-events-none select-none flex flex-col items-end gap-[2px]"
            style={{
                bottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)',
                right: 'calc(env(safe-area-inset-right, 0px) + 6px)',
                zIndex: 2147483647,
                touchAction: 'none',
            }}
        >
            <span
                className="px-1.5 py-[2px] rounded-md text-[9px] font-mono tracking-wider text-white/45 bg-black/35 backdrop-blur-sm shadow-sm"
                style={{ letterSpacing: '0.05em' }}
            >
                sw@{swVersion}
            </span>
            <span
                className="px-1.5 py-[2px] rounded-md text-[9px] font-mono tracking-wider text-white/45 bg-black/35 backdrop-blur-sm shadow-sm"
                style={{ letterSpacing: '0.05em' }}
            >
                {buildLabel}
            </span>
        </div>
    );
};

export default BuildBadge;
