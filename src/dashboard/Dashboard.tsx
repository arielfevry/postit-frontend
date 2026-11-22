import React, { useEffect, useState } from "react";
import DashTopBar from "./components/DashTopBar";
import { User, Board } from "../board/types";
import { clearSession, getStoredUser, getToken } from "../board/user";
import TopBar from "../board/components/TopBar";
import { api } from "../board/api";
import CreateModal from "./components/CreateModal";
import Icon from "../board/components/Icon";


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

function BoardDisplay({boards} : {boards: Board[]}) {
    return (
        <div style={{display: 'grid', gap: '16px', marginTop: '16px', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))'}} >
            {boards.map((board) =>
                <div key={board._id}
                className="pb-note pb-note--paper pb-board-card"
                style={{'--pb-paper': '#e6f2a2'} as React.CSSProperties}
                >
                   <span className="pb-tape"/>
                   <button
                   type="button"
                   className="pb-board-card__btn"
                   onClick={() => window.location.href = `/board/${board._id}`}
                   >
                    <span>{board.title}</span>
                    </button> 
                </div>
            )}
        </div>
    );
};

export default function Dashboard( { onHome = goHome, onSignOut = goToLogin} : DashProps) {
    const [user] = useState<User | null>(() => (getToken() ? getStoredUser() : null));
    const [signedOut, setSignedOut] = useState(!user);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearchQuery] = useState("");
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
    
    //Board Search filtering 
   
    const filteredBoards = boards.filter((board) => 
        board.title?.toLowerCase().includes(search.toLowerCase())
    );

    const myBoards = filteredBoards.filter((boards) => 
        String(boards.ownerId) === String(user.id)
    );

    const sharedBoards = filteredBoards.filter((boards) => 
        String(boards.ownerId) !== String(user.id)
    );

     
    


    if(isLoading) return <p>Loading Boards</p>;
    if(error) return <p>{error}</p>

    return (
        
        <div style={{padding: '16px', minHeight: '100vh', boxSizing: 'border-box'}} className="pb-app pb-surface--cork">
            <DashTopBar
            user={user}
            onHome={onHome}
            onSignout={onSignOut}
            onCreate={() => setModal('create')}
            />
            <h1 style={{textAlign: 'center'}}>PostIt!</h1>

            <div style={{display: 'flex', justifyContent: 'center'}}>
                <input 
                type="text"
                placeholder="Search for a Board..."
                value={search}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{display: 'block', width: '100%', maxWidth: '600px',marginBottom: '16px', padding: '16px', boxSizing:"border-box"}}
                />
            </div>
            
            <section>
                <h2 style={{textAlign: "center"}}> My Boards</h2>
                {myBoards.length === 0 ? (
                    <p style={{textAlign: "center", fontSize: "20px"}} className="fw-bold">No Boards</p>
                ) : (
                    <BoardDisplay boards={myBoards} />
                )}
            </section>
            <section>
                <h2 style={{textAlign: "center"}}> Shared Boards</h2>
                {sharedBoards.length === 0 ? (
                    <p style={{textAlign: "center", fontSize: "20px"}} className="fw-bold">No Shared Boards</p>
                ) : (
                    <BoardDisplay boards={sharedBoards} />
                )}
            </section>

            {modal === 'create' && (
                <CreateModal
                onClose={() => setModal(null)}
                user={user}
                />
            )}
        </div>
    );
};

