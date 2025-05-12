import React from 'react';

const UsersList = ({ users, currentUser }) => {
  return (
    <div className="users-list">
      <h5 className="text-center py-2 border-bottom">Users</h5>
      <ul className="list-group list-group-flush">
        {users.map((user) => (
          <li key={user.userId} className="list-group-item d-flex align-items-center">
            <div className={`user-status ${user.userId === currentUser.userId ? 'bg-success' : 'bg-secondary'}`} />
            <div className="ms-2">
              <div>
                {user.name} {user.userId === currentUser.userId ? '(You)' : ''}
              </div>
              {user.presenter && <small className="text-muted">Presenter</small>}
            </div>
          </li>
        ))}
        {users.length === 0 && (
          <li className="list-group-item text-center text-muted">No users online</li>
        )}
      </ul>
    </div>
  );
};

export default UsersList;