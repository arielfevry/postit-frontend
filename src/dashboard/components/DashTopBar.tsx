import { useEffect, useRef, useState } from 'react';
import type { User } from '../../board/types';
import Icon from '../../board/components/Icon';

interface Props {
    user: User;
    onHome: () => void;
    onSignout: () => void;
}

export default function DashTopBar(props: Props) {
    const { user } = props;
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    const initial = (user.name.trim()[0] ?? '?').toUpperCase();

    useEffect(() => {
        if(!menuOpen) return;
        const close = (e: PointerEvent) => {
            if(!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
        };
        window.addEventListener('pointerdown', close);
        return () => window.removeEventListener('pointerdown', close);
    }, [menuOpen]);
    
    return (
        <header className="pb-top">
            <nav className="pb-card pb-nav" aria-label="Dash navigation">
                <button type="button" className="pb-nav__btn pb-nav__brand">
                    <Icon name="home" size={16}/>
                    <span>POST IT!</span>
                </button>
            </nav>
        </header>
    )
}