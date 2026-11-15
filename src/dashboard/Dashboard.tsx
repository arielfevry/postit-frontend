import { useEffect, useState } from "react";
import DashTopBar from "./components/DashTopBar";
import { User, Board } from "../board/types";
import { clearSession, getStoredUser, getToken } from "../board/user";
import TopBar from "../board/components/TopBar";
import { api } from "../board/api";
import CreateModal from "./components/CreateModal";


const goToLogin = () => window.location.assign('/');
const goHome = () => window.location.assign('/dashboard');

interface DashProps {
    onSignOut?: () => void;

    onHome?: () => void;
}


interface ViewProps{
    user: User;
    onHome: () => void;
    onSignOut: () => void;
    onAuthError: () => void;
}

type ModalKind = 'create' | null;

export default function Dashboard( { onHome = goHome, onSignOut = goToLogin} : DashProps) {
    const [user] = useState<User | null>(() => (getToken() ? getStoredUser() : null));
    const [signedOut, setSignedOut] = useState(!user);
    const [isLoading, setIsLoading] = useState(true);
    const [boards, setBoards] = useState<Board[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [modal, setModal] = useState<ModalKind>(null);

    // No session, returns to the login page
    useEffect(() => {
        if(!signedOut) return;
        clearSession();
        onSignOut();
    }, [signedOut, onSignOut]);

    if(!user || signedOut){
        return null;
    }

    //fetches API for all your boards
    useEffect(() => {
        const fetchBoards = async() => {
            try{
                setIsLoading(true);
                const data = await api.listBoards();

                console.log("API response: ", data)

                setBoards(data.boards);
            } catch (err) {
                setError('Failed to load boards');
            }finally {
                setIsLoading(false);
            }
        };

        fetchBoards();
    }, []);


    if(isLoading) return <p>Loading Boards</p>;
    if(error) return <p>{error}</p>

    return (
        
        <div style={{padding: '16px'}}>
            <DashTopBar
            user={user}
            onHome={onHome}
            onSignout={onSignOut}
            onCreate={() => setModal('create')}
            />
            <h1>My Boards</h1>

            {boards?.length === 0 || boards?.length === undefined ? (
                <p>No Boards</p>
            ) : (
                <div style={{display: 'grid', gap: '16px', marginTop: '16px'}}>
                    {boards.map((boards) => (
                        <div key={boards._id} style={{border: '1px solid #000000', padding:'16px'}}>
                            <button type="button" className="pb-nav__btn pb-nav__brand" onClick={() => window.location.href = `/board/${boards._id}`}>
                                <span>{boards.title}</span>
                            </button>
    
                        </div>
                    ))}
                </div>
            )}

            {modal === 'create' && (
                <CreateModal
                onClose={() => setModal(null)}
                user={user}
                />
            )}
        </div>
    );
};

