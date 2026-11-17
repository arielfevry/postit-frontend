import { useEffect, useRef, useState } from 'react';
import type { User } from '../../board/types';
import Icon from '../../board/components/Icon';

interface Props {
    user: User;
    onHome: () => void;
    onSignout: () => void;
    onCreate: () => void;
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
                <button type="button" className="pb-nav__btn pb-nav__brand" style={{border: 'solid 2px', borderColor: '#EB8F38'}}>
                    <Icon name="home" size={16}/>
                    <span>POST IT!</span>
                </button>
                <button type='button' className='pb-nav__btn pb-nav__brand' onClick={props.onCreate} style={{border: 'solid 2px', borderColor: '#eb8f38'}}>
                    <Icon name='plus' size={16}/>
                    <span> Create</span>
                </button>
            </nav>

            <div className="pb-top__right">
                <div className="pb-user" ref={menuRef}>
                    <button type='button'
                    className='pb-card pb-user__btn'
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    style={{border: 'solid 2px', borderColor: '#EB8F38'}}
                    >
                        <span className="pb-user__hello">
                            Hello <strong>{user.name}</strong>
                        </span>
                        <span className="pb-avatar" aria-hidden="true">
                            {initial}
                        </span>
                    </button>
                    {menuOpen && (
                        <div className="dropdown-menu dropdown-menu-end show pb-user__menu" role="menu">
                            {user.email && <div className="dropdown-header small text-truncate">{user.email}</div>}
                            <button type="button" className="dropdown-item d-flex align-items-center gap-2" onClick={props.onSignout} role="menuitem">
                                <Icon name='logout' size={15}/> Sign Out
                            </button>
                        </div>

                    )}
                </div>
            </div>
        </header>
    )
}